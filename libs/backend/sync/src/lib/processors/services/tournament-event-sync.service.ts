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
  eventCodes?: string[];
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
    @InjectFlowProducer('tournament-sync') private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processEventSync(
    data: TournamentEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing tournament event sync`);
    const { tournamentCode, eventCodes, includeSubComponents, workPlan } = data;

    // Check if this job has already created child jobs to prevent duplicate creation on resume
    if ((data as any).childJobsCreated && includeSubComponents) {
      this.logger.log(`Tournament event sync resuming - child jobs already created. Total work plan: ${data.workPlan?.totalJobs || 'unknown'} jobs`);
      return;
    }

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // planning + structure sync + (optional child job creation)

      completedSteps++;
      await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.log(`Work plan: ${workPlan?.totalJobs} total jobs needed`);

      const tournament = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      if (!tournament) {
        throw new Error(`Tournament with code ${tournamentCode} not found`);
      }

      await this.createOrUpdateEvent(tournamentCode, tournament);

      completedSteps++;
      await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed event creation/update`);

      // If includeSubComponents, add sub-component sync jobs with work plan context
      if (includeSubComponents) {
        const subEventJobName = generateJobId('tournament', 'subevent', tournamentCode);

        await this.tournamentSyncFlow.add({
          name: generateJobId('tournament', 'subevent', tournamentCode),
          queueName: TOURNAMENT_EVENT_QUEUE,
          data: {
            tournamentCode,
            eventCodes,
            includeSubComponents: true,
            workPlan, // Pass the work plan to child jobs
            metadata: {
              displayName: `Sub-Event Sync: ${tournamentCode}`,
              description: `Sub-event synchronization for tournament ${tournamentCode}`,
              totalJobs: workPlan?.totalJobs,
              breakdown: workPlan?.breakdown,
            },
          },
          opts: {
            jobId: subEventJobName,
            parent: {
              id: jobId,
              queue: queueQualifiedName,
            },
          },
        });

        // Complete this job's work (planning + structure sync + child job creation)
        completedSteps++;
        const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
        await updateProgress?.(finalProgress);

        // Mark job data to indicate child jobs have been created to prevent re-creation on resume
        if (job) {
          await job.updateData({ ...data, childJobsCreated: true });
        }

        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Tournament event sync waiting for child jobs. Total work plan: ${workPlan?.totalJobs} jobs`);
            throw new WaitingChildrenError();
          }
        }

        this.logger.log(`Completed tournament event sync, child jobs queued. Total work plan: ${workPlan?.totalJobs} jobs`);
        return;
      }
      this.logger.log(`Completed tournament event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament event sync: ${errorMessage}`, error);
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
