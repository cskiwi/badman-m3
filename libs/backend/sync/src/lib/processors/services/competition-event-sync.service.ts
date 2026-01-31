import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionEvent } from '@app/models';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionEventSyncData {
  eventId: string; // Required internal ID
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
    @InjectFlowProducer(COMPETITION_EVENT_QUEUE) private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processEventSync(job: Job<CompetitionEventSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing competition event sync`);
    const { eventId, includeSubComponents, childJobsCreated } = job.data;

    // Step 1: Load the competition event by internal ID
    const competitionEvent = await CompetitionEvent.findOne({ where: { id: eventId } });
    if (!competitionEvent) {
      throw new Error(`Competition event with id ${eventId} not found`);
    }

    const tournamentCode = competitionEvent.visualCode;
    if (!tournamentCode) {
      throw new Error(`Competition event ${eventId} has no visual code`);
    }
    this.logger.log(`Loaded competition event: ${competitionEvent.name} (${tournamentCode})`);

    // Calculate work plan if not provided
    let workPlan = job.data.workPlan;
    if (!workPlan && includeSubComponents) {
      workPlan = await this.competitionPlanningService.calculateCompetitionWorkPlan(
        tournamentCode,
        undefined,
        includeSubComponents,
      );
      await job.updateData({ ...job.data, workPlan });
    }

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2;

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Step 2: Update event data from API
      await this.updateEventFromApi(competitionEvent, tournamentCode);

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed event update`);

      // Step 3: If includeSubComponents, create sub-event child jobs
      if (includeSubComponents && !childJobsCreated) {
        // Get sub-events from API
        const apiSubEvents = await this.tournamentApiClient.getTournamentEvents(tournamentCode);
        const subEventList = Array.isArray(apiSubEvents) ? apiSubEvents : [apiSubEvents];

        if (!subEventList || subEventList.length === 0) {
          this.logger.log(`No sub-events found for competition ${tournamentCode}`);
          await updateProgress(100);
          return;
        }

        // Create child jobs using parent context format (tournamentCode + eventId + eventCode)
        // The child sub-event sync will handle finding or creating the sub-event
        const children = subEventList.map((apiSubEvent) => {
          const subEventJobId = generateJobId('competition', 'subevent', tournamentCode, apiSubEvent.Code);
          return {
            name: subEventJobId,
            queueName: COMPETITION_EVENT_QUEUE,
            data: {
              // Parent job trigger format: tournamentCode + eventId + eventCode
              tournamentCode,
              eventId: competitionEvent.id,
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
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          };
        });

        const validChildren = children;

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.competitionSyncFlow.addBulk(validChildren);

        this.logger.log(`Added ${validChildren.length} child sub-event jobs to flow`);

        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${validChildren.length} sub-event jobs pending`);
          throw new WaitingChildrenError();
        }

        this.logger.log(`All child sub-event jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed competition event sync`);
    } catch (error: unknown) {
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async updateEventFromApi(competitionEvent: CompetitionEvent, tournamentCode: string): Promise<void> {
    this.logger.debug(`Updating competition from API: ${competitionEvent.name} (${tournamentCode})`);

    try {
      const apiEvent = await this.tournamentApiClient.getTournamentDetails(tournamentCode);

      competitionEvent.name = apiEvent.Name || competitionEvent.name;
      competitionEvent.state = apiEvent.TournamentStatus?.toString();
      competitionEvent.openDate = apiEvent.StartDate ? new Date(apiEvent.StartDate) : competitionEvent.openDate;
      competitionEvent.closeDate = apiEvent.EndDate ? new Date(apiEvent.EndDate) : competitionEvent.closeDate;
      competitionEvent.country = apiEvent.Venue?.CountryCode || competitionEvent.country;
      competitionEvent.lastSync = new Date();
      await competitionEvent.save();
      this.logger.debug(`Updated competition ${tournamentCode}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update competition ${tournamentCode}: ${errorMessage}`, error);
      throw error;
    }
  }

}
