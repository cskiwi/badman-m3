import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw } from '@app/models';
import { DrawType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';

export interface CompetitionDrawSyncData {
  drawId: string; // Required internal ID
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
    const { drawId, includeSubComponents, childJobsCreated } = job.data;

    // Step 1: Load the draw by internal ID
    const draw = await CompetitionDraw.findOne({
      where: { id: drawId },
      relations: ['competitionSubEvent', 'competitionSubEvent.competitionEvent'],
    });
    if (!draw) {
      throw new Error(`Competition draw with id ${drawId} not found`);
    }

    const subEvent = draw.competitionSubEvent;
    if (!subEvent) {
      throw new Error(`Sub-event not found for draw ${drawId}`);
    }

    const competitionEvent = subEvent.competitionEvent;
    if (!competitionEvent) {
      throw new Error(`Competition event not found for draw ${drawId}`);
    }

    const tournamentCode = competitionEvent.visualCode;
    const eventCode = subEvent.visualCode;
    const drawCode = draw.visualCode;
    if (!tournamentCode) {
      throw new Error(`Competition event ${competitionEvent.id} has no visual code`);
    }
    if (!eventCode) {
      throw new Error(`Sub-event ${subEvent.id} has no visual code`);
    }
    if (!drawCode) {
      throw new Error(`Draw ${drawId} has no visual code`);
    }
    let drawName = job.data.drawName || draw.name || drawCode;
    this.logger.log(`Loaded draw: ${drawName} (${drawCode}) for competition ${tournamentCode}`);

    try {
      // Phase 1: Process draw + create entry & individual encounter children
      if (!childJobsCreated) {
        await updateProgress(10);

        // Update draw data from API
        await this.updateDrawFromApi(draw, tournamentCode, drawCode);
        drawName = draw.name || drawCode;

        await updateProgress(30);
        this.logger.debug(`Completed draw update`);

        // Create entry child
        const children = [];

        const entryJobName = generateJobId('competition', 'entry', tournamentCode, drawCode);
        children.push({
          name: entryJobName,
          queueName: COMPETITION_EVENT_QUEUE,
          data: {
            drawId: draw.id, // Pass internal ID
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
                drawId: draw.id, // Pass internal ID
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
                drawId: draw.id, // Pass internal ID
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

  private async updateDrawFromApi(draw: CompetitionDraw, tournamentCode: string, drawCode: string): Promise<void> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawData) {
        draw.name = drawData.Name;
        draw.type = this.mapDrawType(drawData.TypeID) as DrawType;
        draw.size = drawData.Size;
        draw.lastSync = new Date();
        await draw.save();
        this.logger.debug(`Updated draw ${drawCode}`);
      }
    } catch {
      this.logger.debug(`Could not update competition draw ${drawCode} from API`);
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
