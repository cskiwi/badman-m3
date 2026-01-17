import { TournamentApiClient, TournamentEvent } from '@app/backend-tournament-api';
import { CompetitionSubEvent } from '@app/models';
import { SubEventTypeEnum } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionSubEventSyncData {
  tournamentCode: string;
  eventCode: string;
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
  childJobsCreated?: boolean;
}

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
    const { tournamentCode, eventCode, includeSubComponents, workPlan, childJobsCreated } = job.data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // structure sync + draw sync + (optional child job creation)

      // Always do the actual work first (create/update sub-event)
      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Create/update sub-events (primary responsibility of SubEvent service)
      await this.createOrUpdateSubEvents(tournamentCode, eventCode);

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed sub-event creation/update`);

      // If includeSubComponents and children haven't been created yet, create them and wait
      if (includeSubComponents && !childJobsCreated) {
        // get draws from api
        const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, eventCode);
        if (!draws || draws.length === 0) {
          this.logger.log(`No draws found for competition ${tournamentCode} event ${eventCode}`);
          return;
        }

        // Create children jobs for the flow
        const children = draws.map((draw) => ({
          name: generateJobId('competition', 'draw', tournamentCode, eventCode, draw.Code),
          queueName: COMPETITION_EVENT_QUEUE,
          data: {
            tournamentCode,
            eventCode,
            drawCode: draw.Code,
            includeSubComponents: true,
            workPlan, // Pass the work plan to child jobs
            metadata: {
              displayName: `Draw Sync: ${tournamentCode} - ${eventCode} - ${draw.Code}`,
              description: `Draw synchronization for competition ${tournamentCode}, event ${eventCode}, draw ${draw.Code}`,
              totalJobs: workPlan?.totalJobs,
              breakdown: workPlan?.breakdown,
            },
          },
          opts: {
            jobId: generateJobId('competition', 'draw', tournamentCode, eventCode, draw.Code),
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

        await this.competitionSyncFlow.addBulk(children);

        this.logger.log(`Added ${children.length} child draw jobs to flow`);

        // Move to waiting for children and throw WaitingChildrenError
        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${draws.length} draw jobs pending`);
          throw new WaitingChildrenError();
        }

        // If we reach here, all children have completed
        this.logger.log(`All child draw jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed competition sub-event sync`);
    } catch (error: unknown) {
      // Re-throw WaitingChildrenError as expected
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition sub-event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async syncDraws(tournamentCode: string, eventCode?: string): Promise<void> {
    this.logger.log(`Syncing draws for tournament ${tournamentCode}`);

    try {
      // Get events to sync draws for
      const events = eventCode
        ? await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode)
        : await this.tournamentApiClient.getTournamentEvents(tournamentCode);

      const flatEvents = Array.isArray(events) ? events : [events];

      for (const event of flatEvents) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            this.logger.debug(`Processing competition draw/group: ${draw.Name} (${draw.Code})`);
            // Competition draws are handled differently - they're more like divisions/groups
            // For now, we'll log this but not create separate entities as the structure
            // is captured in the encounter/match relationships
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync draws for event ${event.Code}: ${errorMessage}`, error);
        }
      }

      this.logger.log(`Synced draws for ${flatEvents.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync draws: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateSubEvent(tournamentCode: string, event: TournamentEvent): Promise<void> {
    this.logger.debug(`Creating/updating competition sub-event: ${event.Name} (${event.Code})`);

    // Check if event already exists
    const existingEvent = await CompetitionSubEvent.findOne({
      where: { name: event.Name },
    });

    if (existingEvent) {
      existingEvent.name = event.Name;
      existingEvent.eventType = this.mapSubEventType(event.GenderID);
      existingEvent.level = event.LevelID;
      existingEvent.lastSync = new Date();
      await existingEvent.save();
    } else {
      const newEvent = new CompetitionSubEvent();
      newEvent.name = event.Name;
      newEvent.eventType = this.mapSubEventType(event.GenderID);
      newEvent.level = event.LevelID;
      newEvent.lastSync = new Date();
      await newEvent.save();
    }
  }

  private async createOrUpdateSubEvents(tournamentCode: string, eventCode?: string): Promise<void> {
    this.logger.log(`Creating/updating sub-events for competition ${tournamentCode}`);

    try {
      let events: any[] = [];

      if (eventCode) {
        // Sync specific event
        const eventList = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
        events = Array.isArray(eventList) ? eventList : [eventList];
      } else {
        // Sync all events
        const eventList = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
        events = Array.isArray(eventList) ? eventList : [eventList];
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
}
