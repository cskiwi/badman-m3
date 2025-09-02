import { Injectable, Logger } from '@nestjs/common';
import { InjectFlowProducer } from '@nestjs/bullmq';
import { FlowProducer } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../../queues/sync.queue';
import { CompetitionStructureSyncService } from './competition-structure-sync.service';

export interface CompetitionEventSyncData {
  tournamentCode: string;
  eventCodes?: string[];
  includeSubComponents?: boolean;
}

@Injectable()
export class CompetitionEventSyncService {
  private readonly logger = new Logger(CompetitionEventSyncService.name);

  constructor(
    private readonly competitionStructureSyncService: CompetitionStructureSyncService,
    @InjectFlowProducer('competition-sync') private readonly competitionSyncFlow: FlowProducer,
  ) {}

  async processEventSync(
    data: CompetitionEventSyncData,
    jobId: string,
    queueQualifiedName: string,
  ): Promise<void> {
    this.logger.log(`Processing competition event sync`);
    const { tournamentCode, eventCodes, includeSubComponents } = data;

    try {
      // Sync events first using the structure sync service
      await this.competitionStructureSyncService.processStructureSync(
        { tournamentCode, eventCodes },
        async (progress: number) => {
          // Progress tracking not needed for event-only sync
          this.logger.debug(`Events sync progress: ${progress}%`);
        },
      );

      // If includeSubComponents, add sub-component sync jobs
      if (includeSubComponents) {
        await this.competitionSyncFlow.add({
          name: 'competition-subevent-sync',
          queueName: COMPETITION_EVENT_QUEUE,
          data: { tournamentCode, eventCodes, includeSubComponents: true },
          opts: {
            parent: {
              id: jobId,
              queue: queueQualifiedName,
            },
          },
        });
      }

      this.logger.log(`Completed competition event sync`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process competition event sync: ${errorMessage}`);
      throw error;
    }
  }
}
