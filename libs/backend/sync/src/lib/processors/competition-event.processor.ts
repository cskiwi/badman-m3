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
  CompetitionGameIndividualSyncData,
  CompetitionGameSyncService,
  CompetitionStandingSyncData,
  CompetitionStandingSyncService,
  CompetitionSubEventSyncData,
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
  ) {
    super();
  }

  async process(job: Job<StructureSyncJobData | GameSyncJobData, void, string>, token: string): Promise<void> {
    if (job.name.includes('competition-sync-structure')) {
      // Structure sync jobs should be handled by individual specialized processors
      // This should not happen - structure sync logic should be in specialized services
      throw new Error('Structure sync jobs should not be processed here - use specialized processors');
    } else if (job.name.includes('competition-sync-games')) {
      await this.competitionGameSyncService.processGameSync(job as Job<GameSyncJobData>, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-event-')) {
      await this.competitionEventSyncService.processEventSync(
        job,
        async (progress: number) => {
          this.logger.debug(`Competition event sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        token,
      );
    } else if (job.name.includes('competition-subevent-')) {
      await this.competitionSubEventSyncService.processSubEventSync(
        job as Job<CompetitionSubEventSyncData>,
        async (progress: number) => {
          this.logger.debug(`Competition subevent sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        token,
      );
    } else if (job.name.includes('competition-draw-')) {
      await this.competitionDrawSyncService.processDrawSync(
        job as Job<CompetitionDrawSyncData>,
        async (progress: number) => {
          this.logger.debug(`Competition draw sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        token,
      );
    } else if (job.name.includes('competition-encounter-')) {
      await this.competitionEncounterSyncService.processEncounterSync(
        job as Job<CompetitionEncounterSyncData>,
        async (progress: number) => {
          this.logger.debug(`Competition encounter sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        token,
      );
    } else if (job.name.includes('competition-standing-')) {
      await this.competitionStandingSyncService.processStandingSync(
        job as Job<CompetitionStandingSyncData>,
        async (progress: number) => {
          this.logger.debug(`Competition standing sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        token,
      );
    } else if (job.name.includes('competition-game-')) {
      await this.competitionGameSyncService.processGameIndividualSync(job as Job<CompetitionGameIndividualSyncData>, async (progress: number) => {
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('competition-entry-')) {
      await this.competitionEntrySyncService.processEntrySync(
        job as Job<CompetitionEntrySyncData>,
        async (progress: number) => {
          this.logger.debug(`Competition entry sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        token,
      );
    } else {
      throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}
