import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionEvent } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';
import { CompetitionSubEventSyncService } from './competition-subevent-sync.service';

export interface CompetitionEventSyncData {
  tournamentCode: string;
  eventCode?: string;
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
  childJobsCreated?: boolean;
}

@Injectable()
export class CompetitionEventSyncService {
  private readonly logger = new Logger(CompetitionEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionPlanningService: CompetitionPlanningService,
    private readonly competitionSubEventSyncService: CompetitionSubEventSyncService,
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processEventSync(job: Job<CompetitionEventSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing competition event sync`);
    const { tournamentCode, eventCode, includeSubComponents, workPlan, childJobsCreated } = job.data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // planning + structure sync + (optional child job creation)

      // Always do the actual work first (create/update event)
      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.log(`Work plan: ${workPlan?.totalJobs} total jobs needed`);

      // Create/update events (primary responsibility of Event service)
      await this.createOrUpdateEvents(tournamentCode, eventCode);

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed event creation/update`);

      // If includeSubComponents and children haven't been created yet, create them and wait
      if (includeSubComponents && !childJobsCreated) {
        // get events from api
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

        if (!events || events.length === 0) {
          this.logger.log(`No events found for competition ${tournamentCode}`);
          return;
        }

        // Create children jobs for the flow
        const children = events.map((event) => ({
          name: generateJobId('competition', 'subevent', tournamentCode, event.Code),
          queueName: COMPETITION_EVENT_QUEUE,
          data: {
            tournamentCode,
            eventCode: event.Code,
            includeSubComponents: true,
            workPlan, // Pass the work plan to child jobs
            metadata: {
              displayName: `Sub-Event Sync: ${tournamentCode} - ${event.Code}`,
              description: `Sub-event synchronization for competition ${tournamentCode} and event ${event.Code}`,
              totalJobs: workPlan?.totalJobs,
              breakdown: workPlan?.breakdown,
            },
          },
          opts: {
            jobId: generateJobId('competition', 'subevent', tournamentCode, event.Code),
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

        this.logger.log(`Added ${children.length} child sub-event jobs to flow`);

        // Move to waiting for children and throw WaitingChildrenError
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${events.length} sub-event jobs pending`);
          throw new WaitingChildrenError();
        }

        // If we reach here, all children have completed
        this.logger.log(`All child sub-event jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed competition event sync`);
    } catch (error: unknown) {
      // Re-throw WaitingChildrenError as expected
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async createOrUpdateEvents(tournamentCode: string, eventCode?: string): Promise<void> {
    this.logger.log(`Creating/updating events for competition ${tournamentCode}`);

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
        await this.createOrUpdateEvent(tournamentCode, event);
      }

      this.logger.log(`Created/updated ${events.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create/update events: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateEvent(tournamentCode: string, event: any): Promise<void> {
    this.logger.debug(`Creating/updating competition: ${event.Name} (${tournamentCode})`);

    try {
      // Check if competition already exists by tournament code
      const existingEvent = await CompetitionEvent.findOne({
        where: { visualCode: tournamentCode },
      });

      if (existingEvent) {
        // Update existing competition with data from <Tournament> XML element
        existingEvent.name = event.Name || existingEvent.name;
        existingEvent.state = event.TournamentStatus?.toString();
        existingEvent.openDate = event.StartDate ? new Date(event.StartDate) : existingEvent.openDate;
        existingEvent.closeDate = event.EndDate ? new Date(event.EndDate) : existingEvent.closeDate;
        existingEvent.country = event.Venue?.CountryCode;
        existingEvent.lastSync = new Date();
        await existingEvent.save();
        this.logger.debug(`Updated existing competition ${tournamentCode}`);
      } else {
        // Create new competition with data from <Tournament> XML element
        const newEvent = new CompetitionEvent();
        newEvent.name = event.Name;
        newEvent.visualCode = tournamentCode;
        newEvent.state = event.TournamentStatus?.toString();
        newEvent.openDate = event.StartDate ? new Date(event.StartDate) : undefined;
        newEvent.closeDate = event.EndDate ? new Date(event.EndDate) : undefined;
        newEvent.country = event.Venue?.CountryCode;
        newEvent.lastSync = new Date();
        await newEvent.save();
        this.logger.debug(`Created new competition ${tournamentCode}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create/update competition ${tournamentCode}: ${errorMessage}`, error);
      throw error;
    }
  }
}
