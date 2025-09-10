import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GameSyncJobData, StructureSyncJobData, TOURNAMENT_EVENT_QUEUE } from '../queues/sync.queue';
import {
  TournamentDrawSyncData,
  TournamentDrawSyncService,
  TournamentEntrySyncData,
  TournamentEntrySyncService,
  TournamentEventSyncService,
  TournamentGameIndividualSyncData,
  TournamentGameSyncService,
  TournamentStandingSyncData,
  TournamentStandingSyncService,
  TournamentSubEventSyncService,
} from './services';

@Injectable()
@Processor(TOURNAMENT_EVENT_QUEUE)
export class TournamentEventProcessor extends WorkerHost {
  private readonly logger = new Logger(TournamentEventProcessor.name);

  constructor(
    private readonly tournamentGameSyncService: TournamentGameSyncService,
    private readonly tournamentEventSyncService: TournamentEventSyncService,
    private readonly tournamentSubEventSyncService: TournamentSubEventSyncService,
    private readonly tournamentDrawSyncService: TournamentDrawSyncService,
    private readonly tournamentEntrySyncService: TournamentEntrySyncService,
    private readonly tournamentStandingSyncService: TournamentStandingSyncService,
  ) {
    super();
  }

  async process(job: Job<StructureSyncJobData | GameSyncJobData, void, string>, token: string): Promise<void> {
    if (job.name.includes('tournament-sync-structure')) {
      // Structure sync jobs should be handled by individual specialized processors
      // This should not happen - structure sync logic should be in specialized services
      throw new Error('Structure sync jobs should not be processed here - use specialized processors');
    } else if (job.name.includes('tournament-sync-games')) {
      await this.tournamentGameSyncService.processGameSync(job.data as GameSyncJobData, async (progress: number) => {
        this.logger.debug(`Tournament game sync progress: ${progress}%`);
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('tournament-event-')) {
      await this.tournamentEventSyncService.processEventSync(job, async (progress: number) => {
        this.logger.debug(`Tournament event sync progress: ${progress}%`);
        await job.updateProgress(progress);
      }, token);
    } else if (job.name.includes('tournament-subevent-')) {
      await this.tournamentSubEventSyncService.processSubEventSync(job, async (progress: number) => {
        this.logger.debug(`Tournament subevent sync progress: ${progress}%`);
        await job.updateProgress(progress);
      }, token);
    } else if (job.name.includes('tournament-draw-')) {
      await this.tournamentDrawSyncService.processDrawSync(job as Job<TournamentDrawSyncData>, async (progress: number) => {
        this.logger.debug(`Tournament draw sync progress: ${progress}%`);
        await job.updateProgress(progress);
      }, token);
    } else if (job.name.includes('tournament-entry-')) {
      await this.tournamentEntrySyncService.processEntrySync(job as Job<TournamentEntrySyncData>, async (progress: number) => {
        this.logger.debug(`Tournament entry sync progress: ${progress}%`);
        await job.updateProgress(progress);
      }, token);
    } else if (job.name.includes('tournament-standing-')) {
      await this.tournamentStandingSyncService.processStandingSync(job.data as TournamentStandingSyncData, async (progress: number) => {
        this.logger.debug(`Tournament standing sync progress: ${progress}%`);
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('tournament-game-')) {
      await this.tournamentGameSyncService.processGameIndividualSync(
        job.data as TournamentGameIndividualSyncData,
        async (progress: number) => {
          this.logger.debug(`Tournament game individual sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
      );
    } else {
      throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}
