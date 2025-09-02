import { TournamentApiClient } from '@app/backend-tournament-api';
import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { CompetitionStructureSyncService } from './competition-structure-sync.service';

export interface CompetitionSubEventSyncData {
  tournamentCode: string;
  eventCodes?: string[];
  subEventCodes?: string[];
  includeSubComponents?: boolean;
}

@Injectable()
export class CompetitionSubEventSyncService {
  private readonly logger = new Logger(CompetitionSubEventSyncService.name);

  constructor(
    private readonly tournamentApiClient: TournamentApiClient,
    private readonly competitionStructureSyncService: CompetitionStructureSyncService,
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processSubEventSync(
    data: CompetitionSubEventSyncData,
    jobId: string,
    queueQualifiedName: string,
  ): Promise<void> {
    this.logger.log(`Processing competition sub-event sync`);
    const { tournamentCode, eventCodes, subEventCodes, includeSubComponents } = data;

    try {
      // Sync teams for competition using structure sync service
      await this.competitionStructureSyncService.processStructureSync(
        { tournamentCode },
        async (progress: number) => {
          this.logger.debug(`Teams sync progress: ${progress}%`);
        },
      );

      // Sync draws for the sub-events
      await this.syncDraws(tournamentCode, subEventCodes || eventCodes);

      // If includeSubComponents, add draw-level sync jobs
      if (includeSubComponents) {
        const events = eventCodes
          ? await Promise.all(eventCodes.map((code: string) => this.tournamentApiClient.getTournamentEvents(tournamentCode, code)))
          : [await this.tournamentApiClient.getTournamentEvents(tournamentCode)];

        const flatEvents = events.flat();

        for (const event of flatEvents) {
          const draws = await this.tournamentApiClient.getEventDraws(tournamentCode, event.Code);

          for (const draw of draws) {
            await this.competitionSyncFlow.add({
              name: 'competition-draw-sync',
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
                parent: {
                  id: jobId,
                  queue: queueQualifiedName,
                },
              },
            });
          }
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
