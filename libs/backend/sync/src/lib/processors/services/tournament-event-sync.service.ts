import { TournamentApiClient } from '@app/backend-tournament-api';
import { TournamentEvent } from '@app/models';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentEventSyncData {
  tournamentCode: string;
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
  childJobsCreated?: boolean;
}

@Injectable()
export class TournamentEventSyncService {
  private readonly logger = new Logger(TournamentEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentPlanningService: TournamentPlanningService,
    @InjectFlowProducer(TOURNAMENT_EVENT_QUEUE) private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processEventSync(job: Job<TournamentEventSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing tournament event sync`);
    const { tournamentCode, includeSubComponents, workPlan, childJobsCreated } = job.data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // planning + structure sync + (optional child job creation)

      // Always do the actual work first (create/update event)
      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.log(`Work plan: ${workPlan?.totalJobs} total jobs needed`);

      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      if (!tournament) {
        throw new Error(`Tournament with code ${tournamentCode} not found`);
      }

      await this.createOrUpdateEvent(tournamentCode, tournament);

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed event creation/update`);

      // If includeSubComponents and children haven't been created yet, create them and wait
      if (includeSubComponents && !childJobsCreated) {
        // get subevents codes from api
        const subEvents = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
        if (!subEvents || subEvents.length === 0) {
          this.logger.log(`No sub-events found for tournament ${tournamentCode}`);
          return;
        }

        // Create children jobs for the flow
        const children = subEvents.map((subEvent) => ({
          name: generateJobId('tournament', 'subevent', tournamentCode, subEvent.Code),
          queueName: TOURNAMENT_EVENT_QUEUE,
          data: {
            tournamentCode,
            eventCode: subEvent.Code,
            includeSubComponents: true,
            workPlan, // Pass the work plan to child jobs
            metadata: {
              displayName: `Sub-Event Sync: ${tournamentCode} - ${subEvent.Code}`,
              description: `Sub-event synchronization for tournament ${tournamentCode} and event ${subEvent.Code}`,
              totalJobs: workPlan?.totalJobs,
              breakdown: workPlan?.breakdown,
            },
          },
          opts: {
            jobId: generateJobId('tournament', 'subevent', tournamentCode, subEvent.Code),
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

        this.logger.log(`Added ${children.length} child sub-event jobs to flow`);

        // Move to waiting for children and throw WaitingChildrenError
        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${subEvents.length} sub-event jobs pending`);
          throw new WaitingChildrenError();
        }

        // If we reach here, all children have completed
        this.logger.log(`All child sub-event jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed tournament event sync`);
    } catch (error: unknown) {
      // Re-throw WaitingChildrenError as expected
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async createOrUpdateEvent(tournamentCode: string, event: any): Promise<void> {
    this.logger.debug(`Creating/updating tournament: ${event.Name} (${tournamentCode})`);

    try {
      // Check if tournament already exists by tournament code
      const existingEvent = await TournamentEvent.findOne({
        where: { visualCode: tournamentCode },
      });

      if (existingEvent) {
        // Update existing tournament with data from <Tournament> XML element
        existingEvent.name = event.Name || existingEvent.name;
        existingEvent.tournamentNumber = event.Number;
        existingEvent.state = event.TournamentStatus?.toString();
        existingEvent.firstDay = event.StartDate ? new Date(event.StartDate) : existingEvent.firstDay;
        existingEvent.openDate = event.OnlineEntryStartDate ? new Date(event.OnlineEntryStartDate) : existingEvent.openDate;
        existingEvent.closeDate = event.OnlineEntryEndDate ? new Date(event.OnlineEntryEndDate) : existingEvent.closeDate;
        existingEvent.country = event.Venue?.CountryCode;
        existingEvent.lastSync = new Date();
        await existingEvent.save();
        this.logger.debug(`Updated existing tournament ${tournamentCode}`);
      } else {
        // Create new tournament with data from <Tournament> XML element
        const newEvent = new TournamentEvent();
        newEvent.name = event.Name;
        newEvent.visualCode = tournamentCode;
        newEvent.tournamentNumber = event.Number;
        newEvent.state = event.TournamentStatus?.toString();
        newEvent.firstDay = event.StartDate ? new Date(event.StartDate) : undefined;
        newEvent.openDate = event.OnlineEntryStartDate ? new Date(event.OnlineEntryStartDate) : undefined;
        newEvent.closeDate = event.OnlineEntryEndDate ? new Date(event.OnlineEntryEndDate) : undefined;
        newEvent.country = event.Venue?.CountryCode;
        newEvent.lastSync = new Date();
        await newEvent.save();
        this.logger.debug(`Created new tournament ${tournamentCode}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create/update tournament ${tournamentCode}: ${errorMessage}`, error);
      throw error;
    }
  }
}
