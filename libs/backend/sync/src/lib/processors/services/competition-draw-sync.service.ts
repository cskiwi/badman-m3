import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionSubEvent } from '@app/models';
import { DrawType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';

export interface CompetitionDrawSyncData {
  tournamentCode: string;
  eventCode: string;
  drawCode: string;
  includeSubComponents?: boolean;
  drawName?: string;
  /** Phase 1: entry + encounter children created */
  childJobsCreated?: boolean;
}

@Injectable()
export class CompetitionDrawSyncService {
  private readonly logger = new Logger(CompetitionDrawSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(job: Job<CompetitionDrawSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing competition draw sync`);
    const { tournamentCode, eventCode, drawCode, includeSubComponents, childJobsCreated } = job.data;

    try {
      let drawName = job.data.drawName || drawCode;

      // Phase 1: Process draw + create entry & individual encounter children
      if (!childJobsCreated) {
        await updateProgress(10);

        // Update/create the draw record
        await this.createOrUpdateDrawFromApi(tournamentCode, eventCode, drawCode);

        // Get draw name for metadata
        drawName = await this.getDrawName(tournamentCode, drawCode);

        await updateProgress(30);
        this.logger.debug(`Completed draw creation/update`);

        // Create entry child
        const children = [];

        const entryJobName = generateJobId('competition', 'entry', tournamentCode, drawCode);
        children.push({
          name: entryJobName,
          queueName: COMPETITION_EVENT_QUEUE,
          data: {
            tournamentCode,
            eventCode,
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

        // Create individual encounter children (one per encounter)
        if (includeSubComponents) {
          const encounters = await this.tournamentApiClient.getEncountersByDraw(tournamentCode, drawCode);
          const validEncounters = encounters?.filter((e) => e != null) || [];
          this.logger.log(`Found ${validEncounters.length} encounters to sync for draw ${drawCode}`);

          for (const encounter of validEncounters) {
            const encounterJobName = generateJobId('competition', 'encounter', tournamentCode, drawCode, encounter.Code);
            children.push({
              name: encounterJobName,
              queueName: COMPETITION_EVENT_QUEUE,
              data: {
                tournamentCode,
                eventCode,
                drawCode,
                encounterCode: encounter.Code,
                metadata: {
                  displayName: `Encounter: ${encounter.Code}`,
                  drawName: drawName,
                  description: `Encounter ${encounter.Code} for draw ${drawName}`,
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
        }

        await job.updateData({
          ...job.data,
          drawName,
          childJobsCreated: true,
        });

        await this.competitionSyncFlow.addBulk(children);
        this.logger.log(`Added ${children.length} child jobs (entry + ${children.length - 1} encounters)`);

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Waiting for entry + encounters to complete`);
          throw new WaitingChildrenError();
        }
      }

      // Phase 2: After entry + encounters complete, create standing child
      if (includeSubComponents) {
        this.logger.log(`Entry + encounters completed, creating standing job`);
        await updateProgress(70);

        const standingJobName = generateJobId('competition', 'standing', tournamentCode, drawCode);
        try {
          await this.competitionSyncFlow.addBulk([
            {
              name: standingJobName,
              queueName: COMPETITION_EVENT_QUEUE,
              data: {
                tournamentCode,
                eventCode,
                drawCode,
                metadata: {
                  displayName: `Standing: ${drawName}`,
                  drawName: drawName,
                  description: `Standing synchronization for draw ${drawName}`,
                },
              },
              opts: {
                jobId: standingJobName,
                parent: {
                  id: job.id!,
                  queue: job.queueQualifiedName,
                },
              },
            },
          ]);
          this.logger.log(`Added standing job for draw ${drawName}`);
        } catch {
          // Standing job already exists from a previous resume - continue
          this.logger.debug(`Standing job already exists for draw ${drawName}`);
        }

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Waiting for standing to complete`);
          throw new WaitingChildrenError();
        }
      }

      // All phases done
      await updateProgress(100);
      this.logger.log(`Completed competition draw sync`);
    } catch (error: unknown) {
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
