import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { COMPETITION_EVENT_QUEUE, GameSyncJobData, StructureSyncJobData, JOB_TYPES } from '../queues/sync.queue';
import {
  CompetitionDrawSyncData,
  CompetitionDrawSyncService,
  CompetitionEncounterSyncData,
  CompetitionEncounterSyncService,
  CompetitionEntrySyncData,
  CompetitionEntrySyncService,
  CompetitionEventSyncService,
  CompetitionGameIndividualSyncService,
  CompetitionGameSyncService,
  CompetitionStandingSyncData,
  CompetitionStandingSyncService,
  CompetitionSubEventSyncService,
} from './services';

@Injectable()
@Processor(COMPETITION_EVENT_QUEUE)
export class CompetitionEventProcessor extends WorkerHost {
  private readonly logger = new Logger(CompetitionEventProcessor.name);

  constructor(
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

  async process(job: Job<StructureSyncJobData | GameSyncJobData, void, string>, token?: string): Promise<void> {
    if (job.name.includes('competition-sync-structure')) {
      // Structure sync jobs should be handled by individual specialized processors
      // This should not happen - structure sync logic should be in specialized services
      throw new Error('Structure sync jobs should not be processed here - use specialized processors');
    } else if (job.name.includes('competition-sync-games')) {
      await this.competitionGameSyncService.processGameSync(job.data as GameSyncJobData, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-event-')) {
      await this.competitionEventSyncService.processEventSync(job.data, job.id?.toString() || '', job.queueQualifiedName, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-subevent-')) {
      await this.competitionSubEventSyncService.processSubEventSync(job.data, job.id?.toString() || '', job.queueQualifiedName, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-draw-')) {
      await this.competitionDrawSyncService.processDrawSync(job.data as CompetitionDrawSyncData, job.id?.toString() || '', job.queueQualifiedName, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-encounter-')) {
      await this.competitionEncounterSyncService.processEncounterSync(
        job.data as CompetitionEncounterSyncData,
        job.id?.toString() || '',
        job.queueQualifiedName,
        async (progress: number) => {
          await job.updateProgress(progress);
        },
        job,
        token
      );
    } else if (job.name.includes('competition-standing-')) {
      await this.competitionStandingSyncService.processStandingSync(job.data as CompetitionStandingSyncData, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-game-')) {
      await this.competitionGameIndividualSyncService.processGameIndividualSync(job.data, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-entry-')) {
      await this.competitionEntrySyncService.processEntrySync(job.data as CompetitionEntrySyncData, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else {
      throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}
