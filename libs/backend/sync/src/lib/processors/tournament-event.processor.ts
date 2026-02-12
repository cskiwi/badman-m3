import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TOURNAMENT_EVENT_QUEUE } from '../queues/sync.queue';
import { TournamentRankingRecalcJobData } from '../queues/sync.queue';
import {
  TournamentDrawSyncData,
  TournamentDrawSyncService,
  TournamentEntrySyncData,
  TournamentEntrySyncService,
  TournamentEventSyncData,
  TournamentEventSyncService,
  TournamentGameSyncOptions,
  TournamentGameSyncService,
  TournamentRankingRecalcService,
  TournamentStandingSyncData,
  TournamentStandingSyncService,
  TournamentSubEventSyncData,
  TournamentSubEventSyncService,
} from './services';

// Union of all job data types for this processor
type TournamentJobData =
  | TournamentEventSyncData
  | TournamentSubEventSyncData
  | TournamentDrawSyncData
  | TournamentEntrySyncData
  | TournamentStandingSyncData
  | TournamentGameSyncOptions
  | TournamentRankingRecalcJobData;

@Injectable()
@Processor(TOURNAMENT_EVENT_QUEUE, {
  lockDuration: 120000, // 2 minutes - API calls can take 30-60s
})
export class TournamentEventProcessor extends WorkerHost {
  private readonly logger = new Logger(TournamentEventProcessor.name);

  constructor(
    private readonly tournamentGameSyncService: TournamentGameSyncService,
    private readonly tournamentEventSyncService: TournamentEventSyncService,
    private readonly tournamentSubEventSyncService: TournamentSubEventSyncService,
    private readonly tournamentDrawSyncService: TournamentDrawSyncService,
    private readonly tournamentEntrySyncService: TournamentEntrySyncService,
    private readonly tournamentStandingSyncService: TournamentStandingSyncService,
    private readonly tournamentRankingRecalcService: TournamentRankingRecalcService,
  ) {
    super();
  }

  async process(job: Job<TournamentJobData, void, string>, token: string): Promise<void> {
    const jobType = this.extractJobType(job.name);
    const updateProgress = async (progress: number) => {
      this.logger.debug(`Tournament ${jobType} sync progress: ${progress}%`);
      await job.updateProgress(progress);
    };

    switch (jobType) {
      case 'sync-structure':
        throw new Error('Structure sync jobs should not be processed here - use specialized processors');

      case 'event':
        await this.tournamentEventSyncService.processEventSync(
          job as Job<TournamentEventSyncData>,
          updateProgress,
          token,
        );
        break;

      case 'subevent':
        await this.tournamentSubEventSyncService.processSubEventSync(
          job as Job<TournamentSubEventSyncData>,
          updateProgress,
          token,
        );
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
        await this.tournamentGameSyncService.processGameSync(
          job as Job<TournamentGameSyncOptions>,
          updateProgress,
        );
        break;

      case 'ranking-recalc':
        await this.tournamentRankingRecalcService.processRankingRecalc(
          job.data as TournamentRankingRecalcJobData,
          updateProgress,
        );
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
    // Handle special cases with hyphens in the type name
    if (jobName.includes('tournament-sync-structure')) {
      return 'sync-structure';
    }
    if (jobName.includes('tournament-ranking-recalc')) {
      return 'ranking-recalc';
    }

    // Extract type from pattern: tournament-{type}-{codes...}
    // Note: job names may have a prefix, so don't anchor at the start
    const match = jobName.match(/tournament-(\w+)-/);
    return match ? match[1] : 'unknown';
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`Worker error: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.name} (${job.id}) failed: ${error.message}`, error.stack);
  }
}
