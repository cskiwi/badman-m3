import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionSubEvent, CompetitionEvent } from '@app/models';
import { DrawType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';

interface DrawContext {
  draw: CompetitionDraw;
  subEvent: CompetitionSubEvent;
  competitionEvent: CompetitionEvent;
  tournamentCode: string;
  eventCode: string;
  drawCode: string;
}

/**
 * Draw sync can be triggered in two ways:
 * 1. Manual: by drawId (item must exist)
 * 2. Parent job: by tournamentCode + subEventId + drawCode (item might not exist yet)
 */
export type CompetitionDrawSyncData = (
  | { drawId: string } // Manual trigger
  | { tournamentCode: string; subEventId: string; drawCode: string } // Parent job trigger
) & {
  includeSubComponents?: boolean;
  drawName?: string;
  /** Phase 1: entry + encounter children created */
  childJobsCreated?: boolean;
  /** Phase 2: standing child job created */
  standingJobCreated?: boolean;
};

@Injectable()
export class CompetitionDrawSyncService {
  private readonly logger = new Logger(CompetitionDrawSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(job: Job<CompetitionDrawSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing competition draw sync`);
    const { includeSubComponents, childJobsCreated } = job.data;

    // Step 1: Resolve context from either input type
    const context = await this.resolveDrawContext(job.data);
    const { draw, tournamentCode, drawCode } = context;
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
            failParentOnFailure: true,
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
                // Parent job trigger format: tournamentCode + drawId + encounterCode
                tournamentCode,
                drawId: draw.id,
                encounterCode: encounter.Code,
                metadata: {
                  displayName: `Encounter: ${encounter.Code}`,
                  drawName: drawName,
                  description: `Encounter ${encounter.Code} for draw ${drawName}`,
                },
              },
              opts: {
                jobId: encounterJobName,
                failParentOnFailure: true,
                parent: {
                  id: job.id!,
                  queue: job.queueQualifiedName,
                },
              },
            });
          }
        }

        try {
          await this.competitionSyncFlow.addBulk(children);
          this.logger.log(`Added ${children.length} child jobs (entry + ${children.length - 1} encounters)`);
        } catch (err: unknown) {
          // Children may already exist from a previous attempt - log actual error
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`addBulk for draw children returned error: ${errMsg}`);
        }

        await job.updateData({
          ...job.data,
          drawName,
          childJobsCreated: true,
        });

        const shouldWait = await job.moveToWaitingChildren(token!);
        this.logger.log(`moveToWaitingChildren returned shouldWait=${shouldWait} for job ${job.id}`);
        if (shouldWait) {
          this.logger.log(`Phase 1 done — releasing job to wait for entry + encounters (will be resumed by any available worker)`);
          throw new WaitingChildrenError();
        }
      }

      // Phase 2: After entry + encounters complete, create standing child
      if (includeSubComponents && !job.data.standingJobCreated) {
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
                failParentOnFailure: true,
                parent: {
                  id: job.id!,
                  queue: job.queueQualifiedName,
                },
              },
            },
          ]);
          this.logger.log(`Added standing job for draw ${drawName}`);
        } catch (err: unknown) {
          // Standing job may already exist from a previous resume - log actual error
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`addBulk for standing returned error: ${errMsg}`);
        }

        await job.updateData({
          ...job.data,
          standingJobCreated: true,
        });

        const shouldWait = await job.moveToWaitingChildren(token!);
        this.logger.log(`moveToWaitingChildren returned shouldWait=${shouldWait} for job ${job.id}`);
        if (shouldWait) {
          this.logger.log(`Phase 2 done — releasing job to wait for standing (will be resumed by any available worker)`);
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

  /**
   * Resolve draw context from either:
   * 1. Internal ID (manual trigger) - draw must exist
   * 2. Parent context (parent job trigger) - draw might not exist yet
   */
  private async resolveDrawContext(data: CompetitionDrawSyncData): Promise<DrawContext> {
    if ('drawId' in data) {
      return this.resolveFromInternalId(data.drawId);
    } else {
      return this.resolveFromParentContext(data.tournamentCode, data.subEventId, data.drawCode);
    }
  }

  /**
   * Load draw context by internal ID (manual trigger)
   * The draw must exist in the database
   */
  private async resolveFromInternalId(drawId: string): Promise<DrawContext> {
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

    return { draw, subEvent, competitionEvent, tournamentCode, eventCode, drawCode };
  }

  /**
   * Load draw context from parent job data
   * The draw might not exist yet - we have the codes to fetch from API and create it
   */
  private async resolveFromParentContext(
    tournamentCode: string,
    subEventId: string,
    drawCode: string,
  ): Promise<DrawContext> {
    // Load the parent sub-event
    const subEvent = await CompetitionSubEvent.findOne({
      where: { id: subEventId },
      relations: ['competitionEvent'],
    });

    if (!subEvent) {
      throw new Error(`Competition sub-event with id ${subEventId} not found`);
    }

    const competitionEvent = subEvent.competitionEvent;
    if (!competitionEvent) {
      throw new Error(`Competition event not found for sub-event ${subEventId}`);
    }

    const eventCode = subEvent.visualCode;
    if (!eventCode) {
      throw new Error(`Sub-event ${subEventId} has no visual code`);
    }

    // Find or create the draw
    let draw = await CompetitionDraw.findOne({
      where: { visualCode: drawCode, subeventId: subEventId },
    });

    if (!draw) {
      // Create the draw - it will be updated from API in updateDrawFromApi
      draw = new CompetitionDraw();
      draw.visualCode = drawCode;
      draw.subeventId = subEventId;
      draw.lastSync = new Date();
      await draw.save();
      this.logger.debug(`Created new draw ${drawCode} for sub-event ${subEventId}`);
    }

    // Attach relations for consistent context
    draw.competitionSubEvent = subEvent;

    return { draw, subEvent, competitionEvent, tournamentCode, eventCode, drawCode };
  }
}
