import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, WaitingChildrenError } from 'bullmq';
import { GameSyncJobData, StructureSyncJobData, TOURNAMENT_EVENT_QUEUE } from '../queues/sync.queue';
import {
  TournamentDrawSyncData,
  TournamentDrawSyncService,
  TournamentEventSyncService,
  TournamentGameIndividualSyncService,
  TournamentGameSyncService,
  TournamentStandingSyncData,
  TournamentStandingSyncService,
  TournamentStructureSyncService,
  TournamentSubEventSyncService,
} from './services';

@Injectable()
@Processor(TOURNAMENT_EVENT_QUEUE)
export class TournamentEventProcessor extends WorkerHost {
  private readonly logger = new Logger(TournamentEventProcessor.name);

  constructor(
    private readonly tournamentStructureSyncService: TournamentStructureSyncService,
    private readonly tournamentGameSyncService: TournamentGameSyncService,
    private readonly tournamentEventSyncService: TournamentEventSyncService,
    private readonly tournamentSubEventSyncService: TournamentSubEventSyncService,
    private readonly tournamentDrawSyncService: TournamentDrawSyncService,
    private readonly tournamentStandingSyncService: TournamentStandingSyncService,
    private readonly tournamentGameIndividualSyncService: TournamentGameIndividualSyncService,
  ) {
    super();
  }

  async process(job: Job<StructureSyncJobData | GameSyncJobData, void, string>, token: string): Promise<void> {
    if (job.name.includes('tournament-sync-structure')) {
      await this.tournamentStructureSyncService.processStructureSync(job.data as StructureSyncJobData, async (progress: number) => {
        this.logger.debug(`Tournament structure sync progress: ${progress}%`);
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('tournament-sync-games')) {
      await this.tournamentGameSyncService.processGameSync(job.data as GameSyncJobData, async (progress: number) => {
        this.logger.debug(`Tournament game sync progress: ${progress}%`);
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('tournament-event-')) {
      await this.tournamentEventSyncService.processEventSync(job.data, job.id?.toString() || '', job.queueQualifiedName, async (progress: number) => {
        this.logger.debug(`Tournament event sync progress: ${progress}%`);
        await job.updateProgress(progress);
      }, job, token);
    } else if (job.name.includes('tournament-subevent-')) {
      await this.tournamentSubEventSyncService.processSubEventSync(
        job.data,
        job.id?.toString() || '',
        job.queueQualifiedName,
        async (progress: number) => {
          this.logger.debug(`Tournament subevent sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        job,
        token,
      );
    } else if (job.name.includes('tournament-draw-')) {
      await this.tournamentDrawSyncService.processDrawSync(
        job.data as TournamentDrawSyncData,
        job.id?.toString() || '',
        job.queueQualifiedName,
        async (progress: number) => {
          this.logger.debug(`Tournament draw sync progress: ${progress}%`);
          await job.updateProgress(progress);
        },
        job,
        token,
      );
    } else if (job.name.includes('tournament-standing-')) {
      await this.tournamentStandingSyncService.processStandingSync(job.data as TournamentStandingSyncData, async (progress: number) => {
        this.logger.debug(`Tournament standing sync progress: ${progress}%`);
        await job.updateProgress(progress);
      });
    } else if (job.name.includes('tournament-game-')) {
      await this.tournamentGameIndividualSyncService.processGameIndividualSync(job.data, async (progress: number) => {
        this.logger.debug(`Tournament game individual sync progress: ${progress}%`);
        await job.updateProgress(progress);
      });
    } else {
      throw new Error(`Unknown job type: ${job.name}`);
    }
  }
}
