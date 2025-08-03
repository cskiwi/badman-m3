import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { COMPETITION_EVENT_QUEUE, GameSyncJobData, StructureSyncJobData, SyncJobType } from '../queues/sync.queue';
import {
  CompetitionDrawSyncData,
  CompetitionDrawSyncService,
  CompetitionEncounterSyncService,
  CompetitionEntrySyncData,
  CompetitionEntrySyncService,
  CompetitionEventSyncService,
  CompetitionGameIndividualSyncService,
  CompetitionGameSyncService,
  CompetitionStandingSyncData,
  CompetitionStandingSyncService,
  CompetitionStructureSyncService,
  CompetitionSubEventSyncService,
} from './services';

@Injectable()
@Processor(COMPETITION_EVENT_QUEUE)
export class CompetitionEventProcessor extends WorkerHost {
  private readonly logger = new Logger(CompetitionEventProcessor.name);

  constructor(
    private readonly competitionStructureSyncService: CompetitionStructureSyncService,
    private readonly competitionGameSyncService: CompetitionGameSyncService,
    private readonly competitionEventSyncService: CompetitionEventSyncService,
    private readonly competitionSubEventSyncService: CompetitionSubEventSyncService,
    private readonly competitionDrawSyncService: CompetitionDrawSyncService,
    private readonly competitionEntrySyncService: CompetitionEntrySyncService,
    private readonly competitionEncounterSyncService: CompetitionEncounterSyncService,
    private readonly competitionStandingSyncService: CompetitionStandingSyncService,
    private readonly competitionGameIndividualSyncService: CompetitionGameIndividualSyncService,
  ) {
    super();
  }

  async process(job: Job<StructureSyncJobData | GameSyncJobData, void, string>): Promise<void> {
    switch (job.name) {
      case SyncJobType.COMPETITION_STRUCTURE_SYNC: {
        await this.competitionStructureSyncService.processStructureSync(job.data as StructureSyncJobData, async (progress: number) => {
          await job.updateProgress(progress);
        });
        break;
      }
      case SyncJobType.COMPETITION_GAME_SYNC: {
        await this.competitionGameSyncService.processGameSync(job.data as GameSyncJobData, async (progress: number) => {
          await job.updateProgress(progress);
        });
        break;
      }
      case 'competition-event-sync': {
        await this.competitionEventSyncService.processEventSync(job.data, job.id?.toString() || '', job.queueQualifiedName);
        break;
      }
      case 'competition-subevent-sync': {
        await this.competitionSubEventSyncService.processSubEventSync(job.data, job.id?.toString() || '', job.queueQualifiedName);
        break;
      }
      case 'competition-draw-sync': {
        await this.competitionDrawSyncService.processDrawSync(job.data as CompetitionDrawSyncData, job.id?.toString() || '', job.queueQualifiedName);
        break;
      }
      case 'competition-encounter-sync': {
        await this.competitionEncounterSyncService.processEncounterSync(job.data, async (progress: number) => {
          await job.updateProgress(progress);
        });
        break;
      }
      case 'competition-standing-sync': {
        await this.competitionStandingSyncService.processStandingSync(job.data as CompetitionStandingSyncData);
        break;
      }
      case 'competition-game-sync': {
        await this.competitionGameIndividualSyncService.processGameIndividualSync(job.data, async (progress: number) => {
          await job.updateProgress(progress);
        });
        break;
      }
      case 'competition-entry-sync': {
        await this.competitionEntrySyncService.processEntrySync(job.data as CompetitionEntrySyncData);
        break;
      }
      default: {
        throw new Error(`Unknown job type: ${job.name}`);
      }
    }
  }
}
