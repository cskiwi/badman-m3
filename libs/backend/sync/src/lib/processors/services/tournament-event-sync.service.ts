import { TournamentApiClient } from '@app/backend-tournament-api';
import { TournamentEvent, TournamentSubEvent } from '@app/models';
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

        // Create sub-events first so we have their IDs
        for (const apiSubEvent of apiSubEvents) {
          await this.createOrUpdateSubEvent(tournamentEvent, apiSubEvent);
        }

        // Look up sub-event internal IDs and create child jobs
        const children = await Promise.all(
          apiSubEvents.map(async (apiSubEvent) => {
            const subEvent = await TournamentSubEvent.findOne({
              where: { visualCode: apiSubEvent.Code, eventId: tournamentEvent.id },
            });

            if (!subEvent) {
              this.logger.warn(`Sub-event ${apiSubEvent.Code} not found after creation, skipping`);
              return null;
            }

            const subEventJobId = generateJobId('tournament', 'subevent', tournamentCode, apiSubEvent.Code);
            return {
              name: subEventJobId,
              queueName: TOURNAMENT_EVENT_QUEUE,
              data: {
                subEventId: subEvent.id, // Pass internal ID
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
          }),
        );

        const validChildren = children.filter((c) => c !== null);

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.tournamentSyncFlow.addBulk(validChildren);

        this.logger.log(`Added ${validChildren.length} child sub-event jobs to flow`);

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${validChildren.length} sub-event jobs pending`);
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
      tournamentEvent.state = apiEvent.TournamentStatus?.toString();
      tournamentEvent.firstDay = apiEvent.StartDate ? new Date(apiEvent.StartDate) : tournamentEvent.firstDay;
      tournamentEvent.openDate = apiEvent.OnlineEntryStartDate ? new Date(apiEvent.OnlineEntryStartDate) : tournamentEvent.openDate;
      tournamentEvent.closeDate = apiEvent.OnlineEntryEndDate ? new Date(apiEvent.OnlineEntryEndDate) : tournamentEvent.closeDate;
      tournamentEvent.country = apiEvent.Venue?.CountryCode;
      tournamentEvent.lastSync = new Date();
      await tournamentEvent.save();
      this.logger.debug(`Updated tournament ${tournamentCode}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update tournament ${tournamentCode}: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateSubEvent(tournamentEvent: TournamentEvent, apiSubEvent: any): Promise<void> {
    this.logger.debug(`Creating/updating sub-event: ${apiSubEvent.Name} (${apiSubEvent.Code})`);

    const existingSubEvent = await TournamentSubEvent.findOne({
      where: { visualCode: apiSubEvent.Code, eventId: tournamentEvent.id },
    });

    if (existingSubEvent) {
      existingSubEvent.name = apiSubEvent.Name;
      existingSubEvent.genderId = typeof apiSubEvent.GenderID === 'string' ? parseInt(apiSubEvent.GenderID, 10) : apiSubEvent.GenderID;
      existingSubEvent.gameTypeId = typeof apiSubEvent.GameTypeID === 'string' ? parseInt(apiSubEvent.GameTypeID, 10) : apiSubEvent.GameTypeID;
      existingSubEvent.lastSync = new Date();
      await existingSubEvent.save();
      this.logger.debug(`Updated sub-event ${apiSubEvent.Code}`);
    } else {
      const newSubEvent = new TournamentSubEvent();
      newSubEvent.visualCode = apiSubEvent.Code;
      newSubEvent.name = apiSubEvent.Name;
      newSubEvent.eventId = tournamentEvent.id;
      newSubEvent.genderId = typeof apiSubEvent.GenderID === 'string' ? parseInt(apiSubEvent.GenderID, 10) : apiSubEvent.GenderID;
      newSubEvent.gameTypeId = typeof apiSubEvent.GameTypeID === 'string' ? parseInt(apiSubEvent.GameTypeID, 10) : apiSubEvent.GameTypeID;
      newSubEvent.lastSync = new Date();
      await newSubEvent.save();
      this.logger.debug(`Created sub-event ${apiSubEvent.Code}`);
    }
  }
}
