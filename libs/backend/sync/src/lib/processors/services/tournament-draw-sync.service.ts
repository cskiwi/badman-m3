import { TournamentApiClient, TournamentDraw } from '@app/backend-tournament-api';
import { TournamentDraw as TournamentDrawModel, TournamentEvent as TournamentEventModel, TournamentSubEvent } from '@app/models';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentDrawSyncData {
  tournamentCode: string;
  eventCode: string;
  drawCode: string;
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
  childJobsCreated?: boolean;
}

@Injectable()
export class TournamentDrawSyncService {
  private readonly logger = new Logger(TournamentDrawSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentPlanningService: TournamentPlanningService,
    @InjectFlowProducer('tournament-sync') private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(
    data: TournamentDrawSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing tournament draw sync`);
    const { tournamentCode, eventCode, drawCode, includeSubComponents, workPlan } = data;

    try {
      // Check if this job has already created child jobs and handle different resume scenarios
      const isResumeAfterChildren = data.childJobsCreated && includeSubComponents;

      if (isResumeAfterChildren) {
        if (job && token) {
          // We have job and token - this is a legitimate resume after child completion
          this.logger.log(`Tournament draw sync resuming after child completion`);
          // Skip the work but continue to completion logic
        } else {
          // No job/token - this is likely a duplicate job creation, exit early
          this.logger.log(`Tournament draw sync resuming - child jobs already created (duplicate prevention)`);
          return;
        }
      }

      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // update draw + get name + (optional child job creation)

      // Only do the actual work if we're not resuming after children
      if (!isResumeAfterChildren) {
        // Create/update the draw record (primary responsibility of Draw service)
        await this.createOrUpdateDrawFromApi(tournamentCode, eventCode, drawCode);

        completedSteps++;
        await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

        // Get draw name for metadata
        const drawName = await this.getDrawName(tournamentCode, drawCode);

        completedSteps++;
        await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

        // If includeSubComponents, sync games and then standings
        if (includeSubComponents) {
          const gameJobName = generateJobId('tournament', 'game', tournamentCode, drawCode);
          const standingJobName = generateJobId('tournament', 'standing', tournamentCode, drawCode);

          await this.tournamentSyncFlow.add({
            name: generateJobId('tournament', 'game', tournamentCode, drawCode),
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: {
              tournamentCode,
              drawCode,
              metadata: {
                displayName: `Games: ${drawName}`,
                drawName: drawName,
                description: `Game synchronization for draw ${drawName}`,
              },
            },
            children: [
              {
                name: generateJobId('tournament', 'standing', tournamentCode, drawCode),
                queueName: TOURNAMENT_EVENT_QUEUE,
                data: {
                  tournamentCode,
                  drawCode,
                  metadata: {
                    displayName: `Standing: ${drawName}`,
                    drawName: drawName,
                    description: `Standing synchronization for draw ${drawName}`,
                  },
                },
                opts: {
                  jobId: standingJobName,
                },
              },
            ],
            opts: {
              jobId: gameJobName,
              parent: {
                id: jobId,
                queue: queueQualifiedName,
              },
            },
          });

          // Complete this job's work (update draw + get name + child job creation)
          completedSteps++;
          const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
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
            this.logger.log(`Tournament draw sync waiting for child jobs`);
            throw new WaitingChildrenError();
          }
        }

        this.logger.log(`Completed tournament draw sync, child jobs queued`);
        return;
      }

      this.logger.log(`Completed tournament draw sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament draw sync: ${errorMessage}`, error);
      throw error;
    }
  }

  private async createOrUpdateDrawFromApi(tournamentCode: string, eventCode: string, drawCode: string): Promise<void> {
    try {
      // First try to get the draw from the event draws list to get full draw object
      const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, eventCode);
      const drawData = draws.find((d) => d.Code === drawCode);

      if (drawData) {
        // Use the existing createOrUpdateDraw method
        await this.createOrUpdateDraw(tournamentCode, eventCode, drawData);
        return;
      }

      // Fallback to draw details API if not found in event draws
      const drawDetails = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawDetails) {
        // Convert drawDetails to TournamentDraw format for createOrUpdateDraw
        const tournamentDrawData = {
          Code: drawCode,
          Name: drawDetails.Name,
          TypeID: drawDetails.TypeID,
          Size: drawDetails.Size,
        } as TournamentDraw;

        await this.createOrUpdateDraw(tournamentCode, eventCode, tournamentDrawData);
      }
    } catch {
      this.logger.debug(`Could not update tournament draw ${drawCode} from API`);
    }
  }

  /**
   * Get draw name for display purposes
   */
  private async getDrawName(tournamentCode: string, drawCode: string): Promise<string> {
    try {
      // Try to get the draw from the tournament API to get its name
      const events = await this.tournamentApiClient.getTournamentEvents(tournamentCode);

      for (const event of events) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);
          const draw = draws.find((d) => d.Code === drawCode);
          if (draw) {
            return draw.Name || drawCode;
          }
        } catch (error) {
          // Continue to next event if this one fails
          continue;
        }
      }

      // Fallback to draw code if name not found
      return drawCode;
    } catch (error) {
      // Fallback to draw code if API call fails
      return drawCode;
    }
  }

  private async createOrUpdateDraw(tournamentCode: string, eventCode: string, draw: TournamentDraw): Promise<void> {
    this.logger.debug(`Creating/updating tournament draw: ${draw.Name} (${draw.Code})`);

    // Find the sub-event that this draw belongs to
    const subEvent = await TournamentSubEvent.findOne({
      where: { visualCode: eventCode },
    });

    if (!subEvent) {
      this.logger.warn(`Sub-event with code ${eventCode} not found, skipping draw ${draw.Code}`);
      return;
    }

    // Check if draw already exists for this specific sub-event context
    const existingDraw = await TournamentDrawModel.findOne({
      where: {
        visualCode: draw.Code,
        subeventId: subEvent.id,
      },
    });

    if (existingDraw) {
      existingDraw.name = draw.Name;
      existingDraw.type = this.mapDrawType(draw.TypeID);
      existingDraw.size = draw.Size;
      await existingDraw.save();
      this.logger.debug(`Updated existing draw ${draw.Code} for sub-event ${subEvent.id}`);
    } else {
      const newDraw = new TournamentDrawModel();
      newDraw.name = draw.Name;
      newDraw.type = this.mapDrawType(draw.TypeID);
      newDraw.size = draw.Size;
      newDraw.visualCode = draw.Code;
      newDraw.subeventId = subEvent.id;
      newDraw.risers = 0;
      newDraw.fallers = 0;
      await newDraw.save();
      this.logger.debug(`Created new draw ${draw.Code} for sub-event ${subEvent.id}`);
    }
  }

  private mapDrawType(drawTypeId: number | string): string {
    if (typeof drawTypeId === 'string') {
      drawTypeId = parseInt(drawTypeId, 10);
    }

    switch (drawTypeId) {
      case 0:
        return 'KO'; // Knockout elimination
      case 1:
        return 'QUALIFICATION'; // Qualification rounds
      case 2:
        return 'QUALIFICATION'; // Pre-qualification
      case 3:
        return 'POULE'; // Round-robin groups
      case 4:
        return 'KO'; // Playoff/championship
      case 5:
        return 'QUALIFICATION'; // Qualifying tournament
      default:
        return 'KO'; // Default to knockout for tournaments
    }
  }
}
