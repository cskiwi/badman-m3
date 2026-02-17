import { GameType, GenderType, TournamentApiClient, TournamentEvent } from '@app/backend-tournament-api';
import { TournamentSubEvent, TournamentEvent as TournamentEventModel } from '@app/models';
import { GameType as GameTypeModel, SubEventTypeEnum } from '@app/models-enum';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

interface SubEventContext {
  subEvent: TournamentSubEvent;
  tournamentEvent: TournamentEventModel;
  tournamentCode: string;
  eventCode: string;
}

/**
 * Sub-event sync can be triggered in two ways:
 * 1. Manual: by subEventId (item must exist)
 * 2. Parent job: by tournamentCode + eventId + eventCode (item might not exist yet)
 */
export type TournamentSubEventSyncData = (
  | { subEventId: string } // Manual trigger
  | { tournamentCode: string; eventId: string; eventCode: string } // Parent job trigger
) & {
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
  childJobsCreated?: boolean;
};

@Injectable()
export class TournamentSubEventSyncService {
  private readonly logger = new Logger(TournamentSubEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentPlanningService: TournamentPlanningService,
    @InjectFlowProducer(TOURNAMENT_EVENT_QUEUE) private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(job: Job<TournamentSubEventSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing tournament sub-event sync`);
    const { includeSubComponents, workPlan, childJobsCreated } = job.data;

    // Step 1: Resolve context from either input type
    const context = await this.resolveSubEventContext(job.data);
    const { subEvent, tournamentCode, eventCode } = context;
    this.logger.log(`Loaded sub-event: ${subEvent.name} (${eventCode}) for tournament ${tournamentCode}`);

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2;

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Step 2: Update sub-event data from API
      await this.updateSubEventFromApi(subEvent, tournamentCode, eventCode);

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed sub-event update`);

      // Step 3: If includeSubComponents, create draw child jobs
      if (includeSubComponents && !childJobsCreated) {
        // Get draws from API
        const apiDraws = await this.tournamentApiClient.getEventDraws(tournamentCode, eventCode);
        const validDraws = apiDraws?.filter((draw) => draw?.Code) || [];

        if (validDraws.length === 0) {
          this.logger.log(`No valid draws found for event ${eventCode}`);
          await updateProgress(100);
          return;
        }

        // Create child jobs using parent context format (tournamentCode + subEventId + drawCode)
        // The child draw sync will handle finding or creating the draw
        const children = validDraws.map((apiDraw) => {
          const drawJobId = generateJobId('tournament', 'draw', tournamentCode, eventCode, apiDraw.Code);
          return {
            name: drawJobId,
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: {
              // Parent job trigger format: tournamentCode + subEventId + drawCode
              tournamentCode,
              subEventId: subEvent.id,
              drawCode: apiDraw.Code,
              includeSubComponents: true,
              workPlan,
              metadata: {
                displayName: `Draw: ${apiDraw.Name || apiDraw.Code}`,
                description: `Draw synchronization for ${apiDraw.Name || apiDraw.Code}`,
              },
            },
            opts: {
              jobId: drawJobId,
              failParentOnFailure: true,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          };
        });

        const validChildren = children;

        try {
          await this.tournamentSyncFlow.addBulk(validChildren);
          this.logger.log(`Added ${validChildren.length} child draw jobs to flow`);
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
          this.logger.log(`Releasing job to wait for ${validChildren.length} draw children (will be resumed by any available worker)`);
          throw new WaitingChildrenError();
        }

        this.logger.log(`All child draw jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed tournament sub-event sync`);
    } catch (error: unknown) {
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament sub-event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async updateSubEventFromApi(subEvent: TournamentSubEvent, tournamentCode: string, eventCode: string): Promise<void> {
    this.logger.debug(`Updating sub-event from API: ${subEvent.name} (${eventCode})`);

    try {
      const apiEvents = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
      const apiEvent = Array.isArray(apiEvents) ? apiEvents[0] : apiEvents;

      if (apiEvent) {
        subEvent.name = apiEvent.Name;
        subEvent.eventType = this.getEventType(apiEvent);
        subEvent.gameType = this.getGameType(apiEvent);
        subEvent.minLevel = apiEvent.LevelID;
        subEvent.maxLevel = apiEvent.LevelID;
        subEvent.lastSync = new Date();
        await subEvent.save();
        this.logger.debug(`Updated sub-event ${eventCode}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update sub-event ${eventCode}: ${errorMessage}`, error);
      throw error;
    }
  }

  
  private getEventType(xmlEvent: TournamentEvent): SubEventTypeEnum | undefined {
    switch (parseInt(`${xmlEvent.GenderID}`, 10)) {
      case GenderType.Male:
      case GenderType.Boy:
        return SubEventTypeEnum.M;
      case GenderType.Female:
      case GenderType.Girl:
        return SubEventTypeEnum.F;
      case GenderType.Mixed:
        return SubEventTypeEnum.MX;
      default:
        this.logger.warn('No event type found');
        return;
    }
  }

  private getGameType(xmlEvent: TournamentEvent): GameTypeModel | undefined {
    switch (parseInt(`${xmlEvent.GameTypeID}`, 10)) {
      case GameType.Doubles:
        // Stupid fix but should work
        if (parseInt(`${xmlEvent.GenderID}`, 10) === GenderType.Mixed) {
          return GameTypeModel.MX;
        } else {
          return GameTypeModel.D;
        }
      case GameType.Singles:
        return GameTypeModel.S;
      case GameType.Mixed:
        return GameTypeModel.MX;
      default:
        this.logger.warn('No Game type found');
        return;
    }
  }


  /**
   * Resolve sub-event context from either:
   * 1. Internal ID (manual trigger) - sub-event must exist
   * 2. Parent context (parent job trigger) - sub-event might not exist yet
   */
  private async resolveSubEventContext(data: TournamentSubEventSyncData): Promise<SubEventContext> {
    if ('subEventId' in data) {
      return this.resolveFromInternalId(data.subEventId);
    } else {
      return this.resolveFromParentContext(data.tournamentCode, data.eventId, data.eventCode);
    }
  }

  /**
   * Load sub-event context by internal ID (manual trigger)
   * The sub-event must exist in the database
   */
  private async resolveFromInternalId(subEventId: string): Promise<SubEventContext> {
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

    const tournamentCode = tournamentEvent.visualCode;
    const eventCode = subEvent.visualCode;

    if (!tournamentCode) {
      throw new Error(`Tournament event ${tournamentEvent.id} has no visual code`);
    }
    if (!eventCode) {
      throw new Error(`Sub-event ${subEventId} has no visual code`);
    }

    return { subEvent, tournamentEvent, tournamentCode, eventCode };
  }

  /**
   * Load sub-event context from parent job data
   * The sub-event might not exist yet - we have the codes to fetch from API and create it
   */
  private async resolveFromParentContext(tournamentCode: string, eventId: string, eventCode: string): Promise<SubEventContext> {
    // Load the parent event
    const tournamentEvent = await TournamentEventModel.findOne({
      where: { id: eventId },
    });

    if (!tournamentEvent) {
      throw new Error(`Tournament event with id ${eventId} not found`);
    }

    // Find or create the sub-event
    let subEvent = await TournamentSubEvent.findOne({
      where: { visualCode: eventCode, eventId },
    });

    if (!subEvent) {
      // Create the sub-event - it will be updated from API in updateSubEventFromApi
      subEvent = new TournamentSubEvent();
      subEvent.visualCode = eventCode;
      subEvent.eventId = eventId;
      subEvent.lastSync = new Date();
      await subEvent.save();
      this.logger.debug(`Created new sub-event ${eventCode} for event ${eventId}`);
    }

    // Attach relations for consistent context
    subEvent.tournamentEvent = tournamentEvent;

    return { subEvent, tournamentEvent, tournamentCode, eventCode };
  }
}
