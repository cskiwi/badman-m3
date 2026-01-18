import { TournamentApiClient, TournamentDraw } from '@app/backend-tournament-api';
import { TournamentDraw as TournamentDrawModel, TournamentSubEvent } from '@app/models';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentDrawSyncData {
  tournamentCode: string;
  eventCode?: string;
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
    @InjectFlowProducer(TOURNAMENT_EVENT_QUEUE) private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processDrawSync(job: Job<TournamentDrawSyncData>, updateProgress: (progress: number) => Promise<void>, token: string): Promise<void> {
    this.logger.log(`Processing tournament draw sync`);
    const { tournamentCode, eventCode: providedEventCode, drawCode, includeSubComponents, childJobsCreated } = job.data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // update draw + get name + (optional child job creation)

      // Get draw name for metadata (needed for child job creation)
      const drawInfo = await this.getDraw(tournamentCode, drawCode);

      // Use provided eventCode or the one from the API lookup
      const eventCode = providedEventCode ?? drawInfo?.eventCode;
      if (!eventCode) {
        throw new Error(`Could not find event code for draw ${drawCode} in tournament ${tournamentCode}`);
      }
      const drawName = drawInfo?.draw.Name ?? drawCode;

      // Always do the actual work first (create/update the draw)
      await this.createOrUpdateDrawFromApi(tournamentCode, eventCode, drawCode);

      completedSteps++;
      await updateProgress(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));
      this.logger.debug(`Completed draw creation/update`);

      // If includeSubComponents and children haven't been created yet, create them and wait
      if (includeSubComponents && !childJobsCreated) {
        // Create game job first, then entry and standing as children of game to ensure proper ordering
        const gameJobName = generateJobId('tournament', 'game', tournamentCode, drawCode);
        const entryJobName = generateJobId('tournament', 'entry', tournamentCode, drawCode);
        const standingJobName = generateJobId('tournament', 'standing', tournamentCode, drawCode);

        const children = [
          {
            name: gameJobName,
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: {
              tournamentCode,
              eventCode,
              drawCode,
              metadata: {
                displayName: `Games: ${drawName}`,
                drawName: drawName,
                description: `Game synchronization for draw ${drawName}`,
              },
            },
            opts: {
              jobId: gameJobName,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
            },
          },
          {
            name: entryJobName,
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: {
              tournamentCode,
              eventCode,
              drawCode,
              metadata: {
                displayName: `Entries: ${drawName}`,
                drawName: drawName,
                description: `Entry synchronization for draw ${drawName}`,
              },
            },
            opts: {
              jobId: entryJobName,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
              dependencies: [gameJobName], // Entry depends on game completion
            },
          },
          {
            name: standingJobName,
            queueName: TOURNAMENT_EVENT_QUEUE,
            data: {
              tournamentCode,
              eventCode,
              drawCode,
              metadata: {
                displayName: `Standing: ${drawName}`,
                drawName: drawName,
                description: `Standing synchronization for draw ${drawName}`,
              },
            },
            opts: {
              jobId: standingJobName,
              parent: {
                id: job.id!,
                queue: job.queueQualifiedName,
              },
              dependencies: [entryJobName], // Standing depends on entry completion
            },
          },
        ];

        await job.updateData({
          ...job.data,
          childJobsCreated: true,
        });

        await this.tournamentSyncFlow.addBulk(children);

        this.logger.log(`Added game job with entry (and standing as child of entry) for draw ${drawName}`);

        // Move to waiting for children and throw WaitingChildrenError
        const shouldWait = await job.moveToWaitingChildren(token!);
        if (shouldWait) {
          this.logger.log(`Moving to waiting for children - game job (with entry and standing children) pending for draw ${drawName}`);
          throw new WaitingChildrenError();
        }

        // If we reach here, all children have completed
        this.logger.log(`All child jobs completed for draw ${drawName}, continuing`);
      }

      completedSteps++;
      const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
      await updateProgress(finalProgress);

      this.logger.log(`Completed tournament draw sync`);
    } catch (error: unknown) {
      // Re-throw WaitingChildrenError as expected
      if (error instanceof WaitingChildrenError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament draw sync: ${errorMessage}`, error);
      await job.moveToFailed(error instanceof Error ? error : new Error(errorMessage), token);
      throw error;
    }
  }

  private async createOrUpdateDrawFromApi(tournamentCode: string, eventCode: string, drawCode: string): Promise<void> {
    try {
      // First try to get the draw from the event draws list to get full draw object
      const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, eventCode);
      const drawData = draws.find((d) => d?.Code === drawCode);

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
    } catch (error: unknown) {
      this.logger.error(`Could not update tournament draw ${drawCode} from API`, error);
    }
  }

  /**
   * Find draw and its event code by searching through all tournament events
   * Returns both the draw data and the event code it belongs to
   */
  private async getDraw(tournamentCode: string, drawCode: string): Promise<{ draw: TournamentDraw; eventCode: string } | null> {
    try {
      const events = await this.tournamentApiClient.getTournamentEvents(tournamentCode);

      for (const event of events) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);
          const draw = draws.find((d) => d.Code === drawCode);
          if (draw) {
            this.logger.debug(`Found draw ${drawCode} in event ${event.Code}`);
            return { draw, eventCode: event.Code };
          }
        } catch (error) {
          // Continue to next event if this one fails
          continue;
        }
      }

      this.logger.warn(`Could not find draw ${drawCode} in tournament ${tournamentCode}`);
      return null;
    } catch (error) {
      this.logger.error(`Failed to find draw ${drawCode}`, error);
      return null;
    }
  }

  private async createOrUpdateDraw(tournamentCode: string, eventCode: string, draw: TournamentDraw): Promise<void> {
    this.logger.debug(`Creating/updating tournament draw: ${draw.Name} (${draw.Code})`);

    // Find the sub-event that this draw belongs to with tournament context
    const subEvent = await TournamentSubEvent.findOne({
      where: { 
        visualCode: eventCode,
        tournamentEvent: {
          visualCode: tournamentCode
        }
      },
      relations: ['tournamentEvent']
    });

    if (!subEvent) {
      this.logger.warn(`Sub-event with code ${eventCode} not found for tournament ${tournamentCode}, skipping draw ${draw.Code}`);
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
      newDraw.visualCode = draw.Code;
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
