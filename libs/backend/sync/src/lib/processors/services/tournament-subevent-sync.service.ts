import { TournamentApiClient, TournamentEvent } from '@app/backend-tournament-api';
import { TournamentEvent as TournamentEventModel, TournamentSubEvent } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';
import { SubEventTypeEnum, GameType } from '@app/models-enum';

export interface TournamentSubEventSyncData {
  tournamentCode: string;
  eventCodes?: string[];
  subEventCodes?: string[];
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
    @InjectFlowProducer('tournament-sync') private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(
    data: TournamentSubEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing tournament sub-event sync`);
    const { tournamentCode, eventCodes, subEventCodes, includeSubComponents, workPlan } = data;

    try {
      // Check if this job has already created child jobs and handle different resume scenarios
      const isResumeAfterChildren = data.childJobsCreated && includeSubComponents;

      if (isResumeAfterChildren) {
        if (job && token) {
          // We have job and token - this is a legitimate resume after child completion
          this.logger.log(`Tournament sub-event sync resuming after child completion`);
          // Skip the work but continue to completion logic
        } else {
          // No job/token - this is likely a duplicate job creation, exit early
          this.logger.log(`Tournament sub-event sync resuming - child jobs already created (duplicate prevention)`);
          return;
        }
      }

      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // structure sync + draw sync + (optional child job creation)

      // Only do the actual work if we're not resuming after children
      if (!isResumeAfterChildren) {
        // Create/update sub-events (primary responsibility of SubEvent service)
        await this.createOrUpdateSubEvents(tournamentCode, eventCodes || subEventCodes);

        completedSteps++;
        await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
        this.logger.debug(`Completed sub-event creation/update`);

        // If includeSubComponents, add draw-level sync jobs
        if (includeSubComponents) {
          const events = eventCodes
            ? await Promise.all(eventCodes.map((code: string) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
            : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

          const flatEvents = events.flat();

          for (const event of flatEvents) {
            const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

            for (const draw of draws) {
              const drawJobName = generateJobId('tournament', 'draw', tournamentCode, event.Code, draw.Code);

              await this.tournamentSyncFlow.add({
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
                  jobId: drawJobName,
                  parent: {
                    id: jobId,
                    queue: queueQualifiedName,
                  },
                },
              });
            }
          }

          // Complete this job's work (structure sync + draw sync + child job creation)
          completedSteps++;
          const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
          await updateProgress?.(finalProgress);

          // Mark job data to indicate child jobs have been created to prevent re-creation on resume
          if (job) {
            await job.updateData({ ...data, childJobsCreated: true });
          }
        }
      }

      // Handle completion logic for both first run and resume scenarios
      if (includeSubComponents) {
        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Tournament sub-event sync waiting for child jobs`);
            throw new WaitingChildrenError();
          }
        }

        this.logger.log(`Completed tournament sub-event sync, child jobs queued`);
        return;
      }

      this.logger.log(`Completed tournament sub-event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament sub-event sync: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateSubEvents(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Creating/updating sub-events for tournament ${tournamentCode}`);

    try {
      let events: any[] = [];

      if (eventCodes && eventCodes.length > 0) {
        // Sync specific events
        for (const eventCode of eventCodes) {
          const eventList = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
          events.push(...eventList);
        }
      } else {
        // Sync all events
        events = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
      }

      for (const event of events) {
        await this.createOrUpdateSubEvent(tournamentCode, event);
      }

      this.logger.log(`Created/updated ${events.length} sub-events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create/update sub-events: ${errorMessage}`, error);
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
      existingEvent.level = event.LevelID;
      await existingEvent.save();
      this.logger.debug(`Updated existing sub-event ${event.Code} for tournament ${tournamentCode}`);
    } else {
      const newEvent = new TournamentSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapSubEventType(event.GenderID);
      newEvent.gameType = this.mapGameType(event.GameTypeID);
      newEvent.level = event.LevelID;
      newEvent.visualCode = event.Code;
      newEvent.eventId = tournamentEvent.id; // Link to parent tournament
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
