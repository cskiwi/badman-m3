import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw } from '@app/models';
import { DrawType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionDrawSyncData {
  tournamentCode: string;
  drawCode: string;
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
}

@Injectable()
export class CompetitionDrawSyncService {
  private readonly logger = new Logger(CompetitionDrawSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionPlanningService: CompetitionPlanningService,
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(
    data: CompetitionDrawSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition draw sync`);
    const { tournamentCode, drawCode, includeSubComponents, workPlan } = data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 4 : 3; // update draw + get name + entry job + (optional child jobs)

      // Update/create the draw record and sync entries
      await this.updateCompetitionDrawFromApi(tournamentCode, drawCode);

      completedSteps++;
      await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // Get draw name for metadata
      const drawName = await this.getDrawName(tournamentCode, drawCode);

      completedSteps++;
      await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // Sync entries for this draw
      const entryJobName = generateJobId('competition', 'entry', tournamentCode, drawCode);

      await this.competitionSyncFlow.add({
        name: generateJobId('competition', 'entry', tournamentCode, drawCode),
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
            id: jobId,
            queue: queueQualifiedName,
          },
        },
      });

      completedSteps++;
      await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // If includeSubComponents, sync encounters and then standings
      if (includeSubComponents) {
        const encounterJobName = generateJobId('competition', 'encounter', tournamentCode, drawCode);
        const standingJobName = generateJobId('competition', 'standing', tournamentCode, drawCode);

        await this.competitionSyncFlow.add({
          name: generateJobId('competition', 'encounter', tournamentCode, drawCode),
          queueName: COMPETITION_EVENT_QUEUE,
          data: {
            tournamentCode,
            drawCode,
            metadata: {
              displayName: `Encounters: ${drawName}`,
              drawName: drawName,
              description: `Encounter synchronization for draw ${drawName}`,
            },
          },
          children: [
            {
              name: generateJobId('competition', 'standing', tournamentCode, drawCode),
              queueName: COMPETITION_EVENT_QUEUE,
              data: {
                tournamentCode,
                drawCode,
                metadata: {
                  displayName: `Standing: ${drawName}`,
                  drawName: drawName,
                  description: `Standing synchronization for draw ${drawName}`,
                },
              },
              opts: {
                jobId: standingJobName,
              },
            },
          ],
          opts: {
            jobId: encounterJobName,
            parent: {
              id: jobId,
              queue: queueQualifiedName,
            },
          },
        });

        // Complete this job's work (update draw + get name + entry job + child job creation)
        completedSteps++;
        const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps);
        await updateProgress?.(finalProgress);
        
        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Competition draw sync waiting for child jobs`);
            throw new WaitingChildrenError();
          }
        }
        
        this.logger.log(`Completed competition draw sync, child jobs queued`);
        return;
      }

      // Check if we should wait for children using BullMQ pattern
      if (job && token) {
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Competition draw sync waiting for child jobs`);
          throw new WaitingChildrenError();
        }
      }

      this.logger.log(`Completed competition draw sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition draw sync: ${errorMessage}`);
      throw error;
    }
  }

  private async updateCompetitionDrawFromApi(tournamentCode: string, drawCode: string): Promise<void> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawData) {
        const existingDraw = await CompetitionDraw.findOne({
          where: { visualCode: drawCode },
        });

        if (existingDraw) {
          existingDraw.name = drawData.Name;
          existingDraw.type = this.mapDrawType(drawData.TypeID) as DrawType;
          existingDraw.size = drawData.Size;
          existingDraw.lastSync = new Date();
          await existingDraw.save();
        } else {
          // Create new competition draw
          const newDraw = new CompetitionDraw();
          newDraw.name = drawData.Name;
          newDraw.type = this.mapDrawType(drawData.TypeID) as DrawType;
          newDraw.size = drawData.Size;
          newDraw.visualCode = drawCode;
          newDraw.lastSync = new Date();
          await newDraw.save();
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

  private mapDrawType(drawTypeId: number): string {
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
