import { TournamentApiClient } from '@app/backend-tournament-api';
import { 
  TournamentDraw as TournamentDrawModel, 
  TournamentEvent as TournamentEventModel,
  TournamentSubEvent 
} from '@app/models';
import { DrawType } from '@app/models-enum';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentDrawSyncData {
  tournamentCode: string;
  drawCode: string;
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
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
    const { tournamentCode, drawCode, includeSubComponents, workPlan } = data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // update draw + get name + (optional child job creation)

      // Update/create the draw record
      await this.updateTournamentDrawFromApi(tournamentCode, drawCode);
      
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
              description: `Game synchronization for draw ${drawName}`
            }
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
                  description: `Standing synchronization for draw ${drawName}`
                }
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
      this.logger.error(`Failed to process tournament draw sync: ${errorMessage}`);
      throw error;
    }
  }

  private async updateTournamentDrawFromApi(tournamentCode: string, drawCode: string): Promise<void> {
    try {
      const drawData = await this.tournamentApiClient.getDrawDetails?.(tournamentCode, drawCode);
      if (drawData) {
        // Find the tournament event first to get proper context
        const tournamentEvent = await TournamentEventModel.findOne({
          where: { visualCode: tournamentCode },
        });

        if (!tournamentEvent) {
          this.logger.debug(`Tournament with code ${tournamentCode} not found, skipping draw update`);
          return;
        }

        // Find the draw with tournament context to avoid visualCode ambiguity
        const existingDraw = await TournamentDrawModel.findOne({
          where: {
            visualCode: drawCode,
            tournamentSubEvent: {
              tournamentEvent: {
                id: tournamentEvent.id,
              },
            },
          },
          relations: ['tournamentSubEvent', 'tournamentSubEvent.tournamentEvent'],
        });

        if (existingDraw) {
          existingDraw.name = drawData.Name;
          existingDraw.type = this.mapDrawType(drawData.TypeID);
          existingDraw.size = drawData.Size;
          await existingDraw.save();
        }
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
          const draw = draws.find(d => d.Code === drawCode);
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

  private mapDrawType(drawTypeId: number): string {
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