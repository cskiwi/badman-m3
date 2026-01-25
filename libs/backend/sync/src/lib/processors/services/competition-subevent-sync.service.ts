import { TournamentApiClient } from '@app/backend-tournament-api';
import { CompetitionDraw, CompetitionSubEvent } from '@app/models';
import { SubEventTypeEnum } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionSubEventSyncData {
  subEventId: string; // Required internal ID
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
    const { subEventId, includeSubComponents, workPlan, childJobsCreated } = job.data;

    // Step 1: Load the sub-event by internal ID
    const subEvent = await CompetitionSubEvent.findOne({
      where: { id: subEventId },
      relations: ['competitionEvent'],
    });
    if (!subEvent) {
      throw new Error(`Competition sub-event with id ${subEventId} not found`);
    }

    const competitionEvent = subEvent.competitionEvent;
    if (!competitionEvent) {
      throw new Error(`Competition event not found for sub-event ${subEventId}`);
    }

    const tournamentCode = competitionEvent.visualCode;
    const eventCode = subEvent.visualCode;
    if (!tournamentCode) {
      throw new Error(`Competition event ${competitionEvent.id} has no visual code`);
    }
    if (!eventCode) {
      throw new Error(`Sub-event ${subEventId} has no visual code`);
    }
    this.logger.log(`Loaded sub-event: ${subEvent.name} (${eventCode}) for competition ${tournamentCode}`);

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2;

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      if (workPlan) {
        this.logger.log(`Work plan: ${workPlan.totalJobs} total jobs needed`);
      }

      // Step 2: Update sub-event data from API
      await this.updateSubEventFromApi(subEvent, tournamentCode, eventCode);

      completedSteps++;
      await updateProgress(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed sub-event update`);

      // Step 3: If includeSubComponents, create draw child jobs
      if (includeSubComponents && !childJobsCreated) {
        // Get draws from API
        const apiDraws = await this.tournamentApiClient.getEventDraws(tournamentCode, eventCode);
        if (!apiDraws || apiDraws.length === 0) {
          this.logger.log(`No draws found for competition ${tournamentCode} event ${eventCode}`);
          await updateProgress(100);
          return;
        }

        // Create draws first so we have their IDs
        for (const apiDraw of apiDraws) {
          await this.createOrUpdateDraw(subEvent, apiDraw);
        }

        // Look up draw internal IDs and create child jobs
        const children = await Promise.all(
          apiDraws.map(async (apiDraw) => {
            const draw = await CompetitionDraw.findOne({
              where: { visualCode: apiDraw.Code, subeventId: subEvent.id },
            });

            if (!draw) {
              this.logger.warn(`Draw ${apiDraw.Code} not found after creation, skipping`);
              return null;
            }

            const drawJobId = generateJobId('competition', 'draw', tournamentCode, eventCode, apiDraw.Code);
            return {
              name: drawJobId,
              queueName: COMPETITION_EVENT_QUEUE,
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

        await this.competitionSyncFlow.addBulk(validChildren);

        this.logger.log(`Added ${validChildren.length} child draw jobs to flow`);

        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - ${validChildren.length} draw jobs pending`);
          throw new WaitingChildrenError();
        }

        this.logger.log(`All child draw jobs completed, continuing`);
      }

      completedSteps++;
      const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed competition sub-event sync`);
    } catch (error: unknown) {
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition sub-event sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async updateSubEventFromApi(subEvent: CompetitionSubEvent, tournamentCode: string, eventCode: string): Promise<void> {
    this.logger.debug(`Updating sub-event from API: ${subEvent.name} (${eventCode})`);

    try {
      const apiEvents = await this.tournamentApiClient.getTournamentEvents(tournamentCode, eventCode);
      const apiEvent = Array.isArray(apiEvents) ? apiEvents[0] : apiEvents;

      if (apiEvent) {
        subEvent.name = apiEvent.Name;
        subEvent.eventType = this.mapSubEventType(apiEvent.GenderID);
        subEvent.genderId = typeof apiEvent.GenderID === 'string' ? parseInt(apiEvent.GenderID, 10) : apiEvent.GenderID;
        subEvent.gameTypeId = typeof apiEvent.GameTypeID === 'string' ? parseInt(apiEvent.GameTypeID, 10) : apiEvent.GameTypeID;
        subEvent.paraClassId = apiEvent.ParaClassID;
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

  private async createOrUpdateDraw(subEvent: CompetitionSubEvent, apiDraw: any): Promise<void> {
    this.logger.debug(`Creating/updating draw: ${apiDraw.Name} (${apiDraw.Code})`);

    const existingDraw = await CompetitionDraw.findOne({
      where: { visualCode: apiDraw.Code, subeventId: subEvent.id },
    });

    if (existingDraw) {
      existingDraw.name = apiDraw.Name;
      existingDraw.size = apiDraw.Size;
      existingDraw.lastSync = new Date();
      await existingDraw.save();
      this.logger.debug(`Updated draw ${apiDraw.Code}`);
    } else {
      const newDraw = new CompetitionDraw();
      newDraw.visualCode = apiDraw.Code;
      newDraw.name = apiDraw.Name;
      newDraw.subeventId = subEvent.id;
      newDraw.size = apiDraw.Size;
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
}
