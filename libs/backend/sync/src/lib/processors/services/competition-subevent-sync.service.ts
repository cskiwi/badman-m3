import { TournamentApiClient } from '@app/backend-tournament-api';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer, Job, WaitingChildrenError } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { CompetitionStructureSyncService } from './competition-structure-sync.service';
import { generateJobId } from '../../utils/job.utils';
import { CompetitionPlanningService, CompetitionWorkPlan } from './competition-planning.service';

export interface CompetitionSubEventSyncData {
  tournamentCode: string;
  eventCodes?: string[];
  subEventCodes?: string[];
  includeSubComponents?: boolean;
  workPlan?: CompetitionWorkPlan;
}

@Injectable()
export class CompetitionSubEventSyncService {
  private readonly logger = new Logger(CompetitionSubEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionStructureSyncService: CompetitionStructureSyncService,
    private readonly competitionPlanningService: CompetitionPlanningService,
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(
    data: CompetitionSubEventSyncData,
    jobId: string,
    queueQualifiedName: string,
    updateProgress?: (progress: number) => Promise<void>,
    job?: Job,
    token?: string,
  ): Promise<void> {
    this.logger.log(`Processing competition sub-event sync`);
    const { tournamentCode, eventCodes, subEventCodes, includeSubComponents, workPlan } = data;

    try {
      let completedSteps = 0;
      const totalSteps = includeSubComponents ? 3 : 2; // structure sync + draw sync + (optional child job creation)

      // Sync teams for competition using structure sync service
      await this.competitionStructureSyncService.processStructureSync(
        { tournamentCode },
        async (progress: number) => {
          // Forward structure sync progress proportionally
          const structureProgress = completedSteps + (progress / 100);
          const overallProgress = this.competitionPlanningService.calculateProgress(structureProgress, totalSteps, includeSubComponents);
          await updateProgress?.(overallProgress);
          this.logger.debug(`Structure sync progress: ${progress}%`);
        },
      );
      
      completedSteps++;
      await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // Sync draws for the sub-events
      await this.syncDraws(tournamentCode, subEventCodes || eventCodes);
      
      completedSteps++;
      await updateProgress?.(this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents));

      // If includeSubComponents, add draw-level sync jobs
      if (includeSubComponents) {
        const events = eventCodes
          ? await Promise.all(eventCodes.map((code: string) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
          : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

        const flatEvents = events.flat();

        for (const event of flatEvents) {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            const drawJobName = generateJobId('competition', 'draw', tournamentCode, event.Code, draw.Code);

            await this.competitionSyncFlow.add({
              name: generateJobId('competition', 'draw', tournamentCode, event.Code, draw.Code),
              queueName: COMPETITION_EVENT_QUEUE,
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
        const finalProgress = this.competitionPlanningService.calculateProgress(completedSteps, totalSteps, includeSubComponents);
        await updateProgress?.(finalProgress);
        
        // Check if we should wait for children using BullMQ pattern
        if (job && token) {
          const shouldWait = await job.moveToWaitingChildren(token);
          if (shouldWait) {
            this.logger.log(`Competition sub-event sync waiting for child jobs`);
            throw new WaitingChildrenError();
          }
        }
        
        this.logger.log(`Completed competition sub-event sync, child jobs queued`);
        return;
      }

      // Check if we should wait for children using BullMQ pattern
      if (job && token) {
        const shouldWait = await job.moveToWaitingChildren(token);
        if (shouldWait) {
          this.logger.log(`Competition sub-event sync waiting for child jobs`);
          throw new WaitingChildrenError();
        }
      }

      this.logger.log(`Completed competition sub-event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition sub-event sync: ${errorMessage}`);
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
            this.logger.debug(`Processing competition draw/group: ${draw.Name} (${draw.Code})`);
            // Competition draws are handled differently - they're more like divisions/groups
            // For now, we'll log this but not create separate entities as the structure
            // is captured in the encounter/match relationships
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
