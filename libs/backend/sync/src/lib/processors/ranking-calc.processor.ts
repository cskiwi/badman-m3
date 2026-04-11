import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  RANKING_CALC_QUEUE,
  RankingCalcInitJobData,
  RankingCalcPeriodJobData,
  RankingCalcPlayerBatchJobData,
  RankingCalcFinalizeJobData,
} from '../queues/sync.queue';
import { RankingCalcService } from './services/ranking-calc.service';

type RankingCalcJobData = RankingCalcInitJobData | RankingCalcPeriodJobData | RankingCalcPlayerBatchJobData | RankingCalcFinalizeJobData;

@Injectable()
@Processor(RANKING_CALC_QUEUE, {
  lockDuration: 600000, // 10 minutes — player batch jobs aggregate many rows
})
export class RankingCalcProcessor extends WorkerHost {
  private readonly logger = new Logger(RankingCalcProcessor.name);

  constructor(private readonly rankingCalcService: RankingCalcService) {
    super();
  }

  async process(job: Job<RankingCalcJobData, void, string>): Promise<void> {
    this.logger.log(`Processing ranking calc job: ${job.name} (${job.id})`);

    const updateProgress = async (progress: number) => {
      this.logger.debug(`Ranking calc progress [${job.name}]: ${progress}%`);
      await job.updateProgress(progress);
    };

    switch (job.name) {
      case 'ranking-calc-init':
        await this.rankingCalcService.processInit(job as Job<RankingCalcInitJobData>, updateProgress);
        break;

      case 'ranking-calc-period':
        await this.rankingCalcService.processPeriod(job as Job<RankingCalcPeriodJobData>, updateProgress);
        break;

      case 'ranking-calc-player-batch':
        await this.rankingCalcService.processPlayerBatch(job as Job<RankingCalcPlayerBatchJobData>, updateProgress);
        break;

      case 'ranking-calc-finalize':
        await this.rankingCalcService.processFinalize(job as Job<RankingCalcFinalizeJobData>, updateProgress);
        break;

      default:
        throw new Error(`Unknown ranking calc job type: ${job.name}`);
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
