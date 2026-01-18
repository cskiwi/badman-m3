import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionSubEvent } from '@app/models';
import { DrawType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionDrawSyncData {
  tournamentCode: string;
  eventCode: string;
  drawCode: string;
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
  childJobsCreated?: boolean;
}

@Injectable()
export class CompetitionDrawSyncService {
  private readonly logger = new Logger(CompetitionDrawSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionPlanningService: CompetitionPlanningService,
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(job: Job<CompetitionDrawSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing competition draw sync`);
    const { tournamentCode, eventCode, drawCode, includeSubComponents, workPlan, childJobsCreated } = job.data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 4 : 3; // update draw + get name + entry job + (optional child jobs)

      // Always do the actual work first (create/update draw)
      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Update/create the draw record
      await this.createOrUpdateDrawFromApi(tournamentCode, eventCode, drawCode);

      // Get draw name for metadata
      const drawName = await this.getDrawName(tournamentCode, drawCode);

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed draw creation/update`);

      // Always sync entries for this draw (as a child job)
      if (!childJobsCreated) {
        const children = [];

        // Add entry sync job
        const entryJobName = generateJobId('competition', 'entry', tournamentCode, drawCode);
        children.push({
          name: entryJobName,
          queueName: COMPETITION_EVENT_QUEUE,
          data: {
            tournamentCode,
            drawCode,
            metadata: {
              displayName: `Entries: ${drawName}`,
              drawName: drawName,
              description: `Entry synchronization for draw ${drawName}`,
            },
          },
          opts: {
            jobId: entryJobName,
            parent: {
              id: job.id!,
              queue: job.queueQualifiedName,
            },
          },
        });

        // If includeSubComponents, add encounter sync (encounter will create game + standing as its children)
        if (includeSubComponents) {
          const encounterJobName = generateJobId('competition', 'encounter', tournamentCode, drawCode);

          children.push({
            name: encounterJobName,
            queueName: COMPETITION_EVENT_QUEUE,
            data: {
              tournamentCode,
              drawCode,
              includeSubComponents: true,
              workPlan, // Pass the work plan to child jobs
              metadata: {
                displayName: `Encounters: ${drawName}`,
                drawName: drawName,
                description: `Encounter synchronization for draw ${drawName}`,
                totalJobs: workPlan?.totalJobs,
                breakdown: workPlan?.breakdown,
              },
            },
            opts: {
              jobId: encounterJobName,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          });
        }

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.competitionSyncFlow.addBulk(children);

        this.logger.log(`Added ${children.length} child jobs to flow`);

        // Move to waiting for children and throw WaitingChildrenError
        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${children.length} child jobs pending`);
          throw new WaitingChildrenError();
        }

        // If we reach here, all children have completed
        this.logger.log(`All child jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed competition draw sync`);
    } catch (error: unknown) {
      // Re-throw WaitingChildrenError as expected
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition draw sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async createOrUpdateDrawFromApi(tournamentCode: string, eventCode: string, drawCode: string): Promise<void> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawData) {
        // Find the parent sub-event with competition context
        const subEvent = await CompetitionSubEvent.findOne({
          where: {
            visualCode: eventCode,
            competitionEvent: {
              visualCode: tournamentCode,
            },
          },
          relations: ['competitionEvent'],
        });

        if (!subEvent) {
          this.logger.warn(`Sub-event with code ${eventCode} not found for competition ${tournamentCode}, skipping draw ${drawCode}`);
          return;
        }

        // Find the draw with sub-event context to avoid visualCode ambiguity
        const existingDraw = await CompetitionDraw.findOne({
          where: {
            visualCode: drawCode,
            subeventId: subEvent.id,
          },
        });

        if (existingDraw) {
          existingDraw.name = drawData.Name;
          existingDraw.type = this.mapDrawType(drawData.TypeID) as DrawType;
          existingDraw.size = drawData.Size;
          existingDraw.lastSync = new Date();
          await existingDraw.save();
          this.logger.debug(`Updated existing draw ${drawCode} for sub-event ${eventCode}`);
        } else {
          // Create new competition draw
          const newDraw = new CompetitionDraw();
          newDraw.name = drawData.Name;
          newDraw.type = this.mapDrawType(drawData.TypeID) as DrawType;
          newDraw.size = drawData.Size;
          newDraw.visualCode = drawCode;
          newDraw.subeventId = subEvent.id; // Link to parent sub-event
          newDraw.lastSync = new Date();
          await newDraw.save();
          this.logger.debug(`Created new draw ${drawCode} for sub-event ${eventCode}`);
        }
      }
    } catch {
      this.logger.debug(`Could not update competition draw ${drawCode} from API`);
    }
  }

  /**
   * Get draw name for display purposes
   */
  private async getDrawName(tournamentCode: string, drawCode: string): Promise<string> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      return drawData?.Name || drawCode;
    } catch (error) {
      // Fallback to draw code if API call fails
      return drawCode;
    }
  }

  private mapDrawType(drawTypeId: number | string): string {
    if (typeof drawTypeId === 'string') {
      drawTypeId = parseInt(drawTypeId, 10);
    }

    switch (drawTypeId) {
      case 0:
        return 'KO'; // Knockout elimination
      case 1:
        return 'QUALIFICATION'; // Qualification rounds
      case 2:
        return 'QUALIFICATION'; // Pre-qualification
      case 3:
        return 'POULE'; // Round-robin groups
      case 4:
        return 'KO'; // Playoff/championship
      case 5:
        return 'QUALIFICATION'; // Qualifying tournament
      default:
        return 'POULE'; // Default to round-robin for competitions
    }
  }
}
