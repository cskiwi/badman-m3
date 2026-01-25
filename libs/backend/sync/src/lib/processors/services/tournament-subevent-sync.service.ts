import { TournamentApiClient } from '@app/backend-tournament-api';
import { TournamentDraw, TournamentSubEvent } from '@app/models';
import { GameType, SubEventTypeEnum } from '@app/models-enum';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentSubEventSyncData {
  subEventId: string; // Required internal ID
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
    const { subEventId, includeSubComponents, workPlan, childJobsCreated } = job.data;

    // Step 1: Load the sub-event by internal ID
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

        // Create draws first so we have their IDs
        for (const apiDraw of validDraws) {
          await this.createOrUpdateDraw(subEvent, apiDraw);
        }

        // Look up draw internal IDs and create child jobs
        const children = await Promise.all(
          validDraws.map(async (apiDraw) => {
            const draw = await TournamentDraw.findOne({
              where: { visualCode: apiDraw.Code, subeventId: subEvent.id },
            });

            if (!draw) {
              this.logger.warn(`Draw ${apiDraw.Code} not found after creation, skipping`);
              return null;
            }

            const drawJobId = generateJobId('tournament', 'draw', tournamentCode, eventCode, apiDraw.Code);
            return {
              name: drawJobId,
              queueName: TOURNAMENT_EVENT_QUEUE,
              data: {
                drawId: draw.id, // Pass internal ID
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
          }),
        );

        const validChildren = children.filter((c) => c !== null);

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.tournamentSyncFlow.addBulk(validChildren);

        this.logger.log(`Added ${validChildren.length} child draw jobs to flow`);

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${validChildren.length} draw jobs pending`);
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
        subEvent.eventType = this.mapSubEventType(apiEvent.GenderID);
        subEvent.gameType = this.mapGameType(apiEvent.GameTypeID);
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

  private async createOrUpdateDraw(subEvent: TournamentSubEvent, apiDraw: any): Promise<void> {
    this.logger.debug(`Creating/updating draw: ${apiDraw.Name} (${apiDraw.Code})`);

    const existingDraw = await TournamentDraw.findOne({
      where: { visualCode: apiDraw.Code, subeventId: subEvent.id },
    });

    if (existingDraw) {
      existingDraw.name = apiDraw.Name;
      existingDraw.size = apiDraw.Size;
      existingDraw.lastSync = new Date();
      await existingDraw.save();
      this.logger.debug(`Updated draw ${apiDraw.Code}`);
    } else {
      const newDraw = new TournamentDraw();
      newDraw.visualCode = apiDraw.Code;
      newDraw.name = apiDraw.Name;
      newDraw.subeventId = subEvent.id;
      newDraw.size = apiDraw.Size;
      newDraw.risers = 0;
      newDraw.fallers = 0;
      newDraw.lastSync = new Date();
      await newDraw.save();
      this.logger.debug(`Created draw ${apiDraw.Code}`);
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
