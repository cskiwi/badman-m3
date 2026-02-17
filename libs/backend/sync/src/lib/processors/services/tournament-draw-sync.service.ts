import { TournamentApiClient } from '@app/backend-tournament-api';
import { TournamentDraw as TournamentDrawModel, TournamentSubEvent, TournamentEvent } from '@app/models';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

interface DrawContext {
  draw: TournamentDrawModel;
  subEvent: TournamentSubEvent;
  tournamentEvent: TournamentEvent;
  tournamentCode: string;
  eventCode: string;
  drawCode: string;
}

/**
 * Draw sync can be triggered in two ways:
 * 1. Manual: by drawId (item must exist)
 * 2. Parent job: by tournamentCode + subEventId + drawCode (item might not exist yet)
 */
export type TournamentDrawSyncData = (
  | { drawId: string } // Manual trigger
  | { tournamentCode: string; subEventId: string; drawCode: string } // Parent job trigger
) & {
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
  childJobsCreated?: boolean;
};

@Injectable()
export class TournamentDrawSyncService {
  private readonly logger = new Logger(TournamentDrawSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentPlanningService: TournamentPlanningService,
    @InjectFlowProducer(TOURNAMENT_EVENT_QUEUE) private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(job: Job<TournamentDrawSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing tournament draw sync`);
    const { includeSubComponents, workPlan, childJobsCreated } = job.data;

    // Step 1: Resolve context from either input type
    const context = await this.resolveDrawContext(job.data);
    const { draw, tournamentCode, eventCode, drawCode } = context;
    const drawName = draw.name || drawCode;
    this.logger.log(`Loaded draw: ${drawName} (${drawCode}) for tournament ${tournamentCode}`);

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2;

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Step 2: Update draw data from API
      await this.updateDrawFromApi(draw, tournamentCode, eventCode, drawCode);

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed draw update`);

      // Step 3: If includeSubComponents, create game/entry/standing child jobs
      if (includeSubComponents && !childJobsCreated) {
        const gameJobName = generateJobId('tournament', 'game', tournamentCode, drawCode);
        const entryJobName = generateJobId('tournament', 'entry', tournamentCode, drawCode);
        const standingJobName = generateJobId('tournament', 'standing', tournamentCode, drawCode);

        const children = [
          {
            name: gameJobName,
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: {
              drawId: draw.id, // Pass internal ID
              metadata: {
                displayName: `Games: ${drawName}`,
                drawName: drawName,
                description: `Game synchronization for draw ${drawName}`,
              },
            },
            opts: {
              jobId: gameJobName,
              failParentOnFailure: true,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          },
          {
            name: entryJobName,
            queueName: TOURNAMENT_EVENT_QUEUE,
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
              dependencies: [gameJobName],
            },
          },
          {
            name: standingJobName,
            queueName: TOURNAMENT_EVENT_QUEUE,
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
              dependencies: [entryJobName],
            },
          },
        ];

        try {
          await this.tournamentSyncFlow.addBulk(children);
          this.logger.log(`Added game, entry, standing jobs for draw ${drawName}`);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`addBulk for draw children returned error: ${errMsg}`);
        }

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        const shouldWait = await job.moveToWaitingChildren(token!);
        this.logger.log(`moveToWaitingChildren returned shouldWait=${shouldWait} for job ${job.id}`);
        if (shouldWait) {
          this.logger.log(`Releasing job to wait for draw children (will be resumed by any available worker)`);
          throw new WaitingChildrenError();
        }

        this.logger.log(`All child jobs completed for draw ${drawName}, continuing`);
      }

      completedSteps++;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed tournament draw sync`);
    } catch (error: unknown) {
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament draw sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async updateDrawFromApi(draw: TournamentDrawModel, tournamentCode: string, eventCode: string, drawCode: string): Promise<void> {
    this.logger.debug(`Updating draw from API: ${draw.name} (${drawCode})`);

    try {
      // First try to get the draw from the event draws list
      const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, eventCode);
      const apiDraw = draws?.find((d) => d?.Code === drawCode);

      if (apiDraw) {
        draw.name = apiDraw.Name;
        draw.type = this.mapDrawType(apiDraw.TypeID);
        draw.size = apiDraw.Size;
        draw.lastSync = new Date();
        await draw.save();
        this.logger.debug(`Updated draw ${drawCode}`);
        return;
      }

      // Fallback to draw details API
      const drawDetails = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawDetails) {
        draw.name = drawDetails.Name;
        draw.type = this.mapDrawType(drawDetails.TypeID);
        draw.size = drawDetails.Size;
        draw.lastSync = new Date();
        await draw.save();
        this.logger.debug(`Updated draw ${drawCode} from draw details`);
      }
    } catch (error: unknown) {
      this.logger.warn(`Could not update tournament draw ${drawCode} from API`);
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
        return 'KO'; // Default to knockout for tournaments
    }
  }

  /**
   * Resolve draw context from either:
   * 1. Internal ID (manual trigger) - draw must exist
   * 2. Parent context (parent job trigger) - draw might not exist yet
   */
  private async resolveDrawContext(data: TournamentDrawSyncData): Promise<DrawContext> {
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
    const draw = await TournamentDrawModel.findOne({
      where: { id: drawId },
      relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
    });

    if (!draw) {
      throw new Error(`Tournament draw with id ${drawId} not found`);
    }

    const subEvent = draw.tournamentSubEvent;
    if (!subEvent) {
      throw new Error(`Sub-event not found for draw ${drawId}`);
    }

    const tournamentEvent = subEvent.tournamentEvent;
    if (!tournamentEvent) {
      throw new Error(`Tournament event not found for draw ${drawId}`);
    }

    const tournamentCode = tournamentEvent.visualCode;
    const eventCode = subEvent.visualCode;
    const drawCode = draw.visualCode;

    if (!tournamentCode) {
      throw new Error(`Tournament event ${tournamentEvent.id} has no visual code`);
    }
    if (!eventCode) {
      throw new Error(`Sub-event ${subEvent.id} has no visual code`);
    }
    if (!drawCode) {
      throw new Error(`Draw ${drawId} has no visual code`);
    }

    return { draw, subEvent, tournamentEvent, tournamentCode, eventCode, drawCode };
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
    const subEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
      relations: ['tournamentEvent'],
    });

    if (!subEvent) {
      throw new Error(`Tournament sub-event with id ${subEventId} not found`);
    }

    const tournamentEvent = subEvent.tournamentEvent;
    if (!tournamentEvent) {
      throw new Error(`Tournament event not found for sub-event ${subEventId}`);
    }

    const eventCode = subEvent.visualCode;
    if (!eventCode) {
      throw new Error(`Sub-event ${subEventId} has no visual code`);
    }

    // Find or create the draw
    let draw = await TournamentDrawModel.findOne({
      where: { visualCode: drawCode, subeventId: subEventId },
    });

    if (!draw) {
      // Create the draw - it will be updated from API in updateDrawFromApi
      draw = new TournamentDrawModel();
      draw.visualCode = drawCode;
      draw.subeventId = subEventId;
      draw.lastSync = new Date();
      await draw.save();
      this.logger.debug(`Created new draw ${drawCode} for sub-event ${subEventId}`);
    }

    // Attach relations for consistent context
    draw.tournamentSubEvent = subEvent;

    return { draw, subEvent, tournamentEvent, tournamentCode, eventCode, drawCode };
  }
}
