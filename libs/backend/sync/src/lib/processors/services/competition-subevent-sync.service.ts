import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionSubEvent, CompetitionEvent } from '@app/models';
import { SubEventTypeEnum } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

interface SubEventContext {
  subEvent: CompetitionSubEvent;
  competitionEvent: CompetitionEvent;
  tournamentCode: string;
  eventCode: string;
}

/**
 * Sub-event sync can be triggered in two ways:
 * 1. Manual: by subEventId (item must exist)
 * 2. Parent job: by tournamentCode + eventId + eventCode (item might not exist yet)
 */
export type CompetitionSubEventSyncData = (
  | { subEventId: string } // Manual trigger
  | { tournamentCode: string; eventId: string; eventCode: string } // Parent job trigger
) & {
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
  childJobsCreated?: boolean;
};

@Injectable()
export class CompetitionSubEventSyncService {
  private readonly logger = new Logger(CompetitionSubEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionPlanningService: CompetitionPlanningService,
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(
    job: Job<CompetitionSubEventSyncData>,
    updateProgress: (progress: number) => Promise<void>,
    token: string,
  ): Promise<void> {
    this.logger.log(`Processing competition sub-event sync`);
    const { includeSubComponents, workPlan, childJobsCreated } = job.data;

    // Step 1: Resolve context from either input type
    const context = await this.resolveSubEventContext(job.data);
    const { subEvent, tournamentCode, eventCode } = context;
    this.logger.log(`Loaded sub-event: ${subEvent.name} (${eventCode}) for competition ${tournamentCode}`);

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2;

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Step 2: Update sub-event data from API
      await this.updateSubEventFromApi(subEvent, tournamentCode, eventCode);

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed sub-event update`);

      // Step 3: If includeSubComponents, create draw child jobs
      if (includeSubComponents && !childJobsCreated) {
        // Get draws from API
        const apiDraws = await this.tournamentApiClient.getEventDraws(tournamentCode, eventCode);
        if (!apiDraws || apiDraws.length === 0) {
          this.logger.log(`No draws found for competition ${tournamentCode} event ${eventCode}`);
          await updateProgress(100);
          return;
        }

        // Create child jobs using parent context format (tournamentCode + subEventId + drawCode)
        // The child draw sync will handle finding or creating the draw
        const children = apiDraws.map((apiDraw) => {
          const drawJobId = generateJobId('competition', 'draw', tournamentCode, eventCode, apiDraw.Code);
          return {
            name: drawJobId,
            queueName: COMPETITION_EVENT_QUEUE,
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
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          };
        });

        const validChildren = children;

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.competitionSyncFlow.addBulk(validChildren);

        this.logger.log(`Added ${validChildren.length} child draw jobs to flow`);

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${validChildren.length} draw jobs pending`);
          throw new WaitingChildrenError();
        }

        this.logger.log(`All child draw jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed competition sub-event sync`);
    } catch (error: unknown) {
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition sub-event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async updateSubEventFromApi(subEvent: CompetitionSubEvent, tournamentCode: string, eventCode: string): Promise<void> {
    this.logger.debug(`Updating sub-event from API: ${subEvent.name} (${eventCode})`);

    try {
      const apiEvents = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
      const apiEvent = Array.isArray(apiEvents) ? apiEvents[0] : apiEvents;

      if (apiEvent) {
        subEvent.name = apiEvent.Name;
        subEvent.eventType = this.mapSubEventType(apiEvent.GenderID);
        subEvent.genderId = typeof apiEvent.GenderID === 'string' ? parseInt(apiEvent.GenderID, 10) : apiEvent.GenderID;
        subEvent.gameTypeId = typeof apiEvent.GameTypeID === 'string' ? parseInt(apiEvent.GameTypeID, 10) : apiEvent.GameTypeID;
        subEvent.paraClassId = apiEvent.ParaClassID;
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

  private mapSubEventType(genderId: number | string): SubEventTypeEnum {
    if (typeof genderId === 'string') {
      genderId = parseInt(genderId, 10);
    }

    switch (genderId) {
      case 1:
        return SubEventTypeEnum.M;
      case 2:
        return SubEventTypeEnum.F;
      case 3:
        return SubEventTypeEnum.MX;
      default:
        return SubEventTypeEnum.M;
    }
  }

  /**
   * Resolve sub-event context from either:
   * 1. Internal ID (manual trigger) - sub-event must exist
   * 2. Parent context (parent job trigger) - sub-event might not exist yet
   */
  private async resolveSubEventContext(data: CompetitionSubEventSyncData): Promise<SubEventContext> {
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

    const tournamentCode = competitionEvent.visualCode;
    const eventCode = subEvent.visualCode;

    if (!tournamentCode) {
      throw new Error(`Competition event ${competitionEvent.id} has no visual code`);
    }
    if (!eventCode) {
      throw new Error(`Sub-event ${subEventId} has no visual code`);
    }

    return { subEvent, competitionEvent, tournamentCode, eventCode };
  }

  /**
   * Load sub-event context from parent job data
   * The sub-event might not exist yet - we have the codes to fetch from API and create it
   */
  private async resolveFromParentContext(
    tournamentCode: string,
    eventId: string,
    eventCode: string,
  ): Promise<SubEventContext> {
    // Load the parent event
    const competitionEvent = await CompetitionEvent.findOne({
      where: { id: eventId },
    });

    if (!competitionEvent) {
      throw new Error(`Competition event with id ${eventId} not found`);
    }

    // Find or create the sub-event
    let subEvent = await CompetitionSubEvent.findOne({
      where: { visualCode: eventCode, eventId },
    });

    if (!subEvent) {
      // Create the sub-event - it will be updated from API in updateSubEventFromApi
      subEvent = new CompetitionSubEvent();
      subEvent.visualCode = eventCode;
      subEvent.eventId = eventId;
      subEvent.lastSync = new Date();
      await subEvent.save();
      this.logger.debug(`Created new sub-event ${eventCode} for event ${eventId}`);
    }

    // Attach relations for consistent context
    subEvent.competitionEvent = competitionEvent;

    return { subEvent, competitionEvent, tournamentCode, eventCode };
  }
}
