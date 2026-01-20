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
  TournamentGameSyncOptions,
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
    const jobType = this.extractJobType(job.name);
    const updateProgress = async (progress: number) => {
      this.logger.debug(`Tournament ${jobType} sync progress: ${progress}%`);
      await job.updateProgress(progress);
    };

    switch (jobType) {
      case 'sync-structure':
        throw new Error('Structure sync jobs should not be processed here - use specialized processors');

      case 'event':
        await this.tournamentEventSyncService.processEventSync(job, updateProgress, token);
        break;

      case 'subevent':
        await this.tournamentSubEventSyncService.processSubEventSync(job, updateProgress, token);
        break;

      case 'draw':
        await this.tournamentDrawSyncService.processDrawSync(
          job as Job<TournamentDrawSyncData>,
          updateProgress,
          token,
        );
        break;

      case 'entry':
        await this.tournamentEntrySyncService.processEntrySync(
          job as Job<TournamentEntrySyncData>,
          updateProgress,
          token,
        );
        break;

      case 'standing':
        await this.tournamentStandingSyncService.processStandingSync(
          job.data as TournamentStandingSyncData,
          updateProgress,
        );
        break;

      case 'game':
        await this.tournamentGameSyncService.processGameSync(job, updateProgress);
        break;

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Extract the job type from the job name
   * e.g., "tournament-event-ABC123" -> "event"
   * e.g., "prefix-tournament-sync-structure-ABC123" -> "sync-structure"
   */
  private extractJobType(jobName: string): string {
    // Handle special case for sync-structure first
    if (jobName.includes('tournament-sync-structure')) {
      return 'sync-structure';
    }

    // Extract type from pattern: tournament-{type}-{codes...}
    // Note: job names may have a prefix, so don't anchor at the start
    const match = jobName.match(/tournament-(\w+)-/);
    return match ? match[1] : 'unknown';
  }
}
