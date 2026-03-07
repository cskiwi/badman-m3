import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RANKING_SYNC_QUEUE, RankingSyncInitJobData, RankingSyncPublicationJobData } from '../queues/sync.queue';
import { RankingSyncService } from './services/ranking-sync.service';

type RankingSyncJobData = RankingSyncInitJobData | RankingSyncPublicationJobData;

@Injectable()
@Processor(RANKING_SYNC_QUEUE, {
  lockDuration: 300000, // 5 minutes — publication sync fetches 6 API calls + DB upserts
})
export class RankingSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(RankingSyncProcessor.name);

  constructor(private readonly rankingSyncService: RankingSyncService) {
    super();
  }

  async process(job: Job<RankingSyncJobData, void, string>): Promise<void> {
    this.logger.log(`Processing ranking sync job: ${job.name} (${job.id})`);

    const updateProgress = async (progress: number) => {
      this.logger.debug(`Ranking sync progress [${job.name}]: ${progress}%`);
      await job.updateProgress(progress);
    };

    switch (job.name) {
      case 'ranking-sync-init':
        await this.rankingSyncService.processInit(job as Job<RankingSyncInitJobData>, updateProgress);
        break;

      case 'ranking-sync-publication':
        await this.rankingSyncService.processPublication(job as Job<RankingSyncPublicationJobData>, updateProgress);
        break;

      default:
        throw new Error(`Unknown ranking sync job type: ${job.name}`);
    }
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
