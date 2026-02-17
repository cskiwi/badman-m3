import { TournamentApiClient } from '@app/backend-tournament-api';
import { TournamentEvent } from '@app/models';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentEventSyncData {
  eventId: string; // Required internal ID
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
    const { eventId, includeSubComponents, childJobsCreated } = job.data;

    // Step 1: Load the tournament event by internal ID
    const tournamentEvent = await TournamentEvent.findOne({ where: { id: eventId } });
    if (!tournamentEvent) {
      throw new Error(`Tournament event with id ${eventId} not found`);
    }

    const tournamentCode = tournamentEvent.visualCode;
    if (!tournamentCode) {
      throw new Error(`Tournament event ${eventId} has no visual code`);
    }
    this.logger.log(`Loaded tournament event: ${tournamentEvent.name} (${tournamentCode})`);

    // Calculate work plan if not provided
    let workPlan = job.data.workPlan;
    if (!workPlan && includeSubComponents) {
      workPlan = await this.tournamentPlanningService.calculateTournamentWorkPlan(tournamentCode, undefined, includeSubComponents);
      await job.updateData({ ...job.data, workPlan });
    }

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2;

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Step 2: Update event data from API
      await this.updateEventFromApi(tournamentEvent, tournamentCode);

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed event update`);

      // Step 3: If includeSubComponents, create sub-event child jobs
      if (includeSubComponents && !childJobsCreated) {
        // Get sub-events from API
        const apiSubEvents = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
        if (!apiSubEvents || apiSubEvents.length === 0) {
          this.logger.log(`No sub-events found for tournament ${tournamentCode}`);
          await updateProgress(100);
          return;
        }

        // Create child jobs using parent context format (tournamentCode + eventId + eventCode)
        // The child sub-event sync will handle finding or creating the sub-event
        const children = apiSubEvents.map((apiSubEvent) => {
          const subEventJobId = generateJobId('tournament', 'subevent', tournamentCode, apiSubEvent.Code);
          return {
            name: subEventJobId,
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: {
              // Parent job trigger format: tournamentCode + eventId + eventCode
              tournamentCode,
              eventId: tournamentEvent.id,
              eventCode: apiSubEvent.Code,
              includeSubComponents: true,
              workPlan,
              metadata: {
                displayName: `Sub-Event: ${apiSubEvent.Name || apiSubEvent.Code}`,
                description: `Sub-event synchronization for ${apiSubEvent.Name || apiSubEvent.Code}`,
              },
            },
            opts: {
              jobId: subEventJobId,
              failParentOnFailure: true,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          };
        });

        const validChildren = children;

        try {
          await this.tournamentSyncFlow.addBulk(validChildren);
          this.logger.log(`Added ${validChildren.length} child sub-event jobs to flow`);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`addBulk for sub-event children returned error: ${errMsg}`);
        }

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        const shouldWait = await job.moveToWaitingChildren(token!);
        this.logger.log(`moveToWaitingChildren returned shouldWait=${shouldWait} for job ${job.id}`);
        if (shouldWait) {
          this.logger.log(`Releasing job to wait for ${validChildren.length} sub-event children (will be resumed by any available worker)`);
          throw new WaitingChildrenError();
        }

        this.logger.log(`All child sub-event jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed tournament event sync`);
    } catch (error: unknown) {
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async updateEventFromApi(tournamentEvent: TournamentEvent, tournamentCode: string): Promise<void> {
    this.logger.debug(`Updating tournament from API: ${tournamentEvent.name} (${tournamentCode})`);

    try {
      const apiEvent = await this.tournamentApiClient.getTournamentDetails(tournamentCode);
      if (!apiEvent) {
        throw new Error(`Tournament with code ${tournamentCode} not found in API`);
      }

      tournamentEvent.name = apiEvent.Name || tournamentEvent.name;
      tournamentEvent.tournamentNumber = apiEvent.Number;
      tournamentEvent.firstDay = apiEvent.StartDate ? new Date(apiEvent.StartDate) : tournamentEvent.firstDay;
      tournamentEvent.openDate = apiEvent.OnlineEntryStartDate ? new Date(apiEvent.OnlineEntryStartDate) : tournamentEvent.openDate;
      tournamentEvent.closeDate = apiEvent.OnlineEntryEndDate ? new Date(apiEvent.OnlineEntryEndDate) : tournamentEvent.closeDate;
      tournamentEvent.country = tournamentEvent.country ?? apiEvent.Venue?.CountryCode;
      tournamentEvent.lastSync = new Date();
      await tournamentEvent.save();
      this.logger.debug(`Updated tournament ${tournamentCode}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update tournament ${tournamentCode}: ${errorMessage}`, error);
      throw error;
    }
  }

}
