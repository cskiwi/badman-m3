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
  eventCodes?: string[];
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
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processEventSync(
    data: CompetitionEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition event sync`);
    const { tournamentCode, eventCodes, includeSubComponents, workPlan } = data;

    try {
      // Check if this job has already created child jobs and handle different resume scenarios
      const isResumeAfterChildren = data.childJobsCreated && includeSubComponents;
      
      if (isResumeAfterChildren) {
        if (job && token) {
          // We have job and token - this is a legitimate resume after child completion
          this.logger.log(`Competition event sync resuming after child completion`);
          // Skip the work but continue to completion logic
        } else {
          // No job/token - this is likely a duplicate job creation, exit early
          this.logger.log(`Competition event sync resuming - child jobs already created (duplicate prevention)`);
          return;
        }
      }

      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // planning + structure sync + (optional child job creation)

      // Only do the actual work if we're not resuming after children
      if (!isResumeAfterChildren) {
        // Calculate work plan if not provided
        let currentWorkPlan = workPlan;
        if (!currentWorkPlan) {
          currentWorkPlan = await this.competitionPlanningService.calculateCompetitionWorkPlan(
            tournamentCode, 
            eventCodes, 
            includeSubComponents
          );
          this.logger.log(`Work plan: ${currentWorkPlan.totalJobs} total jobs needed`);
        }
        
        completedSteps++;
        await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

        // Create/update events (primary responsibility of Event service)
        await this.createOrUpdateEvents(tournamentCode, eventCodes);
        this.logger.debug(`Completed event creation/update`);
        
        completedSteps++;
        await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

        // If includeSubComponents, add sub-component sync jobs with work plan context
        if (includeSubComponents) {
          const subEventJobName = generateJobId('competition', 'subevent', tournamentCode);

          await this.competitionSyncFlow.add({
            name: generateJobId('competition', 'subevent', tournamentCode),
            queueName: COMPETITION_EVENT_QUEUE,
            data: { 
              tournamentCode, 
              eventCodes, 
              includeSubComponents: true,
              workPlan: currentWorkPlan,
              metadata: {
                displayName: `Sub-Event Sync: ${tournamentCode}`,
                description: `Sub-event synchronization for competition ${tournamentCode}`,
                totalJobs: currentWorkPlan.totalJobs,
                breakdown: currentWorkPlan.breakdown
              }
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
        // Get work plan for logging (it should exist either from parameter or from the work above)
        const currentWorkPlan = workPlan || await this.competitionPlanningService.calculateCompetitionWorkPlan(
          tournamentCode, 
          eventCodes, 
          includeSubComponents
        );

        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Competition event sync waiting for child jobs. Total work plan: ${currentWorkPlan.totalJobs} jobs`);
            throw new WaitingChildrenError();
          }
        }
        
        this.logger.log(`Completed competition event sync, child jobs queued. Total work plan: ${currentWorkPlan.totalJobs} jobs`);
        return;
      }

      this.logger.log(`Completed competition event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition event sync: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateEvents(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Creating/updating events for competition ${tournamentCode}`);

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
