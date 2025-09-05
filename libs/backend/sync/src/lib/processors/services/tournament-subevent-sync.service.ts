import { TournamentApiClient } from '@app/backend-tournament-api';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../../queues/sync.queue';
import { TournamentStructureSyncService } from './tournament-structure-sync.service';
import { generateJobId } from '../../utils/job.utils';
import { TournamentPlanningService, TournamentWorkPlan } from './tournament-planning.service';

export interface TournamentSubEventSyncData {
  tournamentCode: string;
  eventCodes?: string[];
  subEventCodes?: string[];
  includeSubComponents?: boolean;
  workPlan?: TournamentWorkPlan;
}

@Injectable()
export class TournamentSubEventSyncService {
  private readonly logger = new Logger(TournamentSubEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly tournamentStructureSyncService: TournamentStructureSyncService,
    private readonly tournamentPlanningService: TournamentPlanningService,
    @InjectFlowProducer('tournament-sync') private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(
    data: TournamentSubEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing tournament sub-event sync`);
    const { tournamentCode, eventCodes, subEventCodes, includeSubComponents, workPlan } = data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // structure sync + draw sync + (optional child job creation)

      // Sync entries for tournament using structure sync service
      await this.tournamentStructureSyncService.processStructureSync(
        { tournamentCode, eventCodes: subEventCodes || eventCodes },
        async (progress: number) => {
          // Forward structure sync progress proportionally
          const structureProgress = completedSteps + (progress / 100);
          const overallProgress = this.tournamentPlanningService.calculateProgress(structureProgress, totalSteps, includeSubComponents);
          await updateProgress?.(overallProgress);
          this.logger.debug(`Structure sync progress: ${progress}%`);
        },
      );
      
      completedSteps++;
      await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // Sync draws for the sub-events
      await this.syncDraws(tournamentCode, subEventCodes || eventCodes);
      
      completedSteps++;
      await updateProgress?.(this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // If includeSubComponents, add draw-level sync jobs
      if (includeSubComponents) {
        const events = eventCodes
          ? await Promise.all(eventCodes.map((code: string) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
          : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

        const flatEvents = events.flat();

        for (const event of flatEvents) {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            const drawJobName = generateJobId('tournament', 'draw', tournamentCode, event.Code, draw.Code);

            await this.tournamentSyncFlow.add({
              name: generateJobId('tournament', 'draw', tournamentCode, event.Code, draw.Code),
              queueName: TOURNAMENT_EVENT_QUEUE,
              data: { 
                tournamentCode, 
                drawCode: draw.Code, 
                includeSubComponents: true,
                metadata: {
                  displayName: draw.Name,
                  drawName: draw.Name,
                  eventName: event.Name,
                  description: `Draw: ${draw.Name} in ${event.Name}`
                }
              },
              opts: {
                jobId: drawJobName,
                parent: {
                  id: jobId,
                  queue: queueQualifiedName,
                },
              },
            });
          }
        }
        
        // Complete this job's work (structure sync + draw sync + child job creation)
        completedSteps++;
        const finalProgress = this.tournamentPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
        await updateProgress?.(finalProgress);
        
        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Tournament sub-event sync waiting for child jobs`);
            throw new WaitingChildrenError();
          }
        }
        
        this.logger.log(`Completed tournament sub-event sync, child jobs queued`);
        return;
      }

      this.logger.log(`Completed tournament sub-event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process tournament sub-event sync: ${errorMessage}`);
      throw error;
    }
  }

  private async syncDraws(tournamentCode: string, eventCodes?: string[]): Promise<void> {
    this.logger.log(`Syncing draws for tournament ${tournamentCode}`);

    try {
      // Get events to sync draws for
      const events = eventCodes
        ? await Promise.all(eventCodes.map((code) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
        : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

      const flatEvents = events.flat();

      for (const event of flatEvents) {
        try {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            this.logger.debug(`Processing tournament draw: ${draw.Name} (${draw.Code})`);
            // Tournament draws creation is handled in the structure sync service
            // This method primarily handles the orchestration of draw-level sync jobs
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to sync draws for event ${event.Code}: ${errorMessage}`);
        }
      }

      this.logger.log(`Synced draws for ${flatEvents.length} events`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync draws: ${errorMessage}`);
      throw error;
    }
  }
}