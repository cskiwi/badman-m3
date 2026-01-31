import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { COMPETITION_EVENT_QUEUE } from '../queues/sync.queue';
import {
  CompetitionDrawSyncData,
  CompetitionDrawSyncService,
  CompetitionEncounterSyncData,
  CompetitionEncounterSyncService,
  CompetitionEntrySyncData,
  CompetitionEntrySyncService,
  CompetitionEventSyncData,
  CompetitionEventSyncService,
  CompetitionStandingSyncData,
  CompetitionStandingSyncService,
  CompetitionSubEventSyncData,
  CompetitionSubEventSyncService,
} from './services';

// Union of all job data types for this processor
type CompetitionJobData =
  | CompetitionEventSyncData
  | CompetitionSubEventSyncData
  | CompetitionDrawSyncData
  | CompetitionEntrySyncData
  | CompetitionEncounterSyncData
  | CompetitionStandingSyncData;

@Injectable()
@Processor(COMPETITION_EVENT_QUEUE, {
  lockDuration: 120000, // 2 minutes - API calls can take 30-60s
})
export class CompetitionEventProcessor extends WorkerHost {
  private readonly logger = new Logger(CompetitionEventProcessor.name);

  constructor(
    private readonly competitionEventSyncService: CompetitionEventSyncService,
    private readonly competitionSubEventSyncService: CompetitionSubEventSyncService,
    private readonly competitionDrawSyncService: CompetitionDrawSyncService,
    private readonly competitionEntrySyncService: CompetitionEntrySyncService,
    private readonly competitionEncounterSyncService: CompetitionEncounterSyncService,
    private readonly competitionStandingSyncService: CompetitionStandingSyncService,
  ) {
    super();
  }

  async process(job: Job<CompetitionJobData, void, string>, token: string): Promise<void> {
    const jobType = this.extractJobType(job.name);
    const updateProgress = async (progress: number) => {
      this.logger.debug(`Competition ${jobType} sync progress: ${progress}%`);
      await job.updateProgress(progress);
    };

    switch (jobType) {
      case 'sync-structure':
        // Structure sync jobs should be handled by individual specialized processors
        throw new Error('Structure sync jobs should not be processed here - use specialized processors');

      case 'event':
        await this.competitionEventSyncService.processEventSync(
          job as Job<CompetitionEventSyncData>,
          updateProgress,
          token,
        );
        break;

      case 'subevent':
        await this.competitionSubEventSyncService.processSubEventSync(
          job as Job<CompetitionSubEventSyncData>,
          updateProgress,
          token,
        );
        break;

      case 'draw':
        await this.competitionDrawSyncService.processDrawSync(
          job as Job<CompetitionDrawSyncData>,
          updateProgress,
          token,
        );
        break;

      case 'encounter':
        await this.competitionEncounterSyncService.processEncounterSync(
          job as Job<CompetitionEncounterSyncData>,
          updateProgress,
          token,
        );
        break;

      case 'standing':
        await this.competitionStandingSyncService.processStandingSync(
          job as Job<CompetitionStandingSyncData>,
          updateProgress,
          token,
        );
        break;

      case 'entry':
        await this.competitionEntrySyncService.processEntrySync(
          job as Job<CompetitionEntrySyncData>,
          updateProgress,
          token,
        );
        break;

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  /**
   * Extract the job type from the job name
   * e.g., "competition-event-ABC123" -> "event"
   * e.g., "prefix-competition-sync-structure-ABC123" -> "sync-structure"
   */
  private extractJobType(jobName: string): string {
    // Handle special case for sync-structure first
    if (jobName.includes('competition-sync-structure')) {
      return 'sync-structure';
    }

    // Extract type from pattern: competition-{type}-{codes...}
    // Note: job names may have a prefix, so don't anchor at the start
    const match = jobName.match(/competition-(\w+)-/);
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
