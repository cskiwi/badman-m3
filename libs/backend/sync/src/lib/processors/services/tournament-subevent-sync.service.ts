import { TournamentApiClient, TournamentEvent } from '@app/backend-tournament-api';
import { TournamentEvent as TournamentEventModel, TournamentSubEvent } from '@app/models';
import { GameType, SubEventTypeEnum } from '@app/models-enum';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentSubEventSyncData {
  tournamentCode: string;
  eventId?: string;
  eventCode?: string;
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
  childJobsCreated?: boolean;
}

@Injectable()
export class TournamentSubEventSyncService {
  private readonly logger = new Logger(TournamentSubEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentPlanningService: TournamentPlanningService,
    @InjectFlowProducer(TOURNAMENT_EVENT_QUEUE) private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(
    job: Job<TournamentSubEventSyncData>,
    updateProgress: (progress: number) => Promise<void>,
    token: string,
  ): Promise<void> {
    this.logger.log(`Processing tournament sub-event sync`);
    const { tournamentCode, eventCode, includeSubComponents, childJobsCreated } = job.data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // structure sync + draw sync + (optional child job creation)

      // Get event information (needed for child job creation)
      const event = (await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode))?.[0];

      if (!event) {
        throw new Error(`Event with code ${eventCode} not found in tournament ${tournamentCode}`);
      }

      // Always do the actual work first (create/update sub-event)
      await this.createOrUpdateSubEvent(tournamentCode, event);

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed sub-event creation/update`);

      // If includeSubComponents and children haven't been created yet, create them and wait
      if (includeSubComponents && !childJobsCreated) {
        const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

        const validDraws = draws.filter((draw) => draw?.Code);

        if (validDraws.length === 0) {
          this.logger.log(`No valid draws found for event ${event.Code}`);
          return;
        }

        // Log any skipped draws
        const skippedDraws = draws.length - validDraws.length;
        if (skippedDraws > 0) {
          this.logger.warn(`${skippedDraws} draws without codes were skipped for event ${event.Code}`);
        }

        // Create children jobs for the flow
        const children = validDraws.map((draw) => ({
          name: generateJobId('tournament', 'draw', tournamentCode, event.Code, draw.Code),
          queueName: TOURNAMENT_EVENT_QUEUE,
          data: {
            tournamentCode,
            eventCode: event.Code,
            drawCode: draw.Code,
            includeSubComponents: true,
            metadata: {
              displayName: draw.Name,
              drawName: draw.Name,
              eventName: event.Name,
              description: `Draw: ${draw.Name} in ${event.Name}`,
            },
          },
          opts: {
            jobId: generateJobId('tournament', 'draw', tournamentCode, event.Code, draw.Code),
            parent: {
              id: job.id!,
              queue: job.queueQualifiedName,
            },
          },
        }));

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.tournamentSyncFlow.addBulk(children);

        this.logger.log(`Added ${children.length} child draw jobs to flow`);

        // Move to waiting for children and throw WaitingChildrenError
        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${validDraws.length} draw jobs pending`);
          throw new WaitingChildrenError();
        }

        // If we reach here, all children have completed
        this.logger.log(`All child draw jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed tournament sub-event sync`);
    } catch (error: unknown) {
      // Re-throw WaitingChildrenError as expected
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament sub-event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  async createOrUpdateSubEvent(tournamentCode: string, event: TournamentEvent): Promise<void> {
    this.logger.debug(`Creating/updating tournament sub-event: ${event.Name} (${event.Code})`);

    // Find the tournament event to link the sub-event to
    const tournamentEvent = await TournamentEventModel.findOne({
      where: { visualCode: tournamentCode },
    });

    if (!tournamentEvent) {
      this.logger.warn(`Tournament with code ${tournamentCode} not found, skipping sub-event creation`);
      return;
    }

    // Check if event already exists within this specific tournament context
    const existingEvent = await TournamentSubEvent.findOne({
      where: {
        visualCode: event.Code,
        eventId: tournamentEvent.id,
      },
    });

    if (existingEvent) {
      existingEvent.name = event.Name;
      existingEvent.eventType = this.mapSubEventType(event.GenderID);
      existingEvent.gameType = this.mapGameType(event.GameTypeID);
      existingEvent.minLevel = event.LevelID;
      existingEvent.maxLevel = event.LevelID;
      existingEvent.lastSync = new Date();
      await existingEvent.save();
      this.logger.debug(`Updated existing sub-event ${event.Code} for tournament ${tournamentCode}`);
    } else {
      const newEvent = new TournamentSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapSubEventType(event.GenderID);
      newEvent.gameType = this.mapGameType(event.GameTypeID);
      newEvent.minLevel = event.LevelID;
      newEvent.maxLevel = event.LevelID;
      newEvent.visualCode = event.Code;
      newEvent.eventId = tournamentEvent.id; // Link to parent tournament
      newEvent.lastSync = new Date();
      await newEvent.save();
      this.logger.debug(`Created new sub-event ${event.Code} for tournament ${tournamentCode}`);
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

  private mapGameType(gameTypeId: number | string): GameType {
    if (typeof gameTypeId === 'string') {
      gameTypeId = parseInt(gameTypeId, 10);
    }

    switch (gameTypeId) {
      case 1:
        return GameType.S;
      case 2:
        return GameType.D;
      default:
        return GameType.MX;
    }
  }
}
