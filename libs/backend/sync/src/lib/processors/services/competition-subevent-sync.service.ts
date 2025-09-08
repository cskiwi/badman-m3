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
  eventCodes?: string[];
  subEventCodes?: string[];
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
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(
    data: CompetitionSubEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition sub-event sync`);
    const { tournamentCode, eventCodes, subEventCodes, includeSubComponents, workPlan } = data;

    try {
      // Check if this job has already created child jobs and handle different resume scenarios
      const isResumeAfterChildren = data.childJobsCreated && includeSubComponents;

      if (isResumeAfterChildren) {
        if (job && token) {
          // We have job and token - this is a legitimate resume after child completion
          this.logger.log(`Competition sub-event sync resuming after child completion`);
          // Skip the work but continue to completion logic
        } else {
          // No job/token - this is likely a duplicate job creation, exit early
          this.logger.log(`Competition sub-event sync resuming - child jobs already created (duplicate prevention)`);
          return;
        }
      }

      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // structure sync + draw sync + (optional child job creation)

      // Only do the actual work if we're not resuming after children
      if (!isResumeAfterChildren) {
        // Create/update sub-events (primary responsibility of SubEvent service)
        await this.createOrUpdateSubEvents(tournamentCode, subEventCodes || eventCodes);

        completedSteps++;
        await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
        this.logger.debug(`Completed sub-event creation/update`);

        completedSteps++;
        await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

        // If includeSubComponents, add draw-level sync jobs
        if (includeSubComponents) {
          const events = eventCodes
            ? await Promise.all(eventCodes.map((code: string) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
            : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

          const flatEvents = events.flat();

          for (const event of flatEvents) {
            const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

            for (const draw of draws) {
              const drawJobName = generateJobId('competition', 'draw', tournamentCode, event.Code, draw.Code);

              await this.competitionSyncFlow.add({
                name: generateJobId('competition', 'draw', tournamentCode, event.Code, draw.Code),
                queueName: COMPETITION_EVENT_QUEUE,
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
          const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
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
            this.logger.log(`Competition sub-event sync waiting for child jobs`);
            throw new WaitingChildrenError();
          }
        }

        this.logger.log(`Completed competition sub-event sync, child jobs queued`);
        return;
      }

      this.logger.log(`Completed competition sub-event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition sub-event sync: ${errorMessage}`, error);
      throw error;
    }
  }

  private async syncDraws(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing draws for tournament ${tournamentCode}`);

    try {
      // Get events to sync draws for
      const events = eventCodes
        ? await Promise.all(eventCodes.map((code) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();

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

  private async createOrUpdateSubEvents(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Creating/updating sub-events for competition ${tournamentCode}`);

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
