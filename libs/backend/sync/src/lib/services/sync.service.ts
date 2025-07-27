import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SYNC_QUEUE,
  SyncJobType,
  TournamentDiscoveryJobData,
  StructureSyncJobData,
  GameSyncJobData,
  TeamMatchingJobData,
} from '../queues/sync.queue';

@Injectable()
export class SyncService {
  constructor(
    @InjectQueue(SYNC_QUEUE)
    private readonly syncQueue: Queue,
  ) {}

  /**
   * Daily tournament discovery - runs at 6 AM
   */
  @Cron('0 6 * * *')
  async scheduleTournamentDiscovery(): Promise<void> {
    await this.queueTournamentDiscovery();
  }

  /**
   * Competition structure sync - runs every 12 hours during May-August
   */
  @Cron('0 */12 * 5-8 *')
  async scheduleCompetitionStructureSync(): Promise<void> {
    await this.queueCompetitionStructureSync();
  }

  /**
   * Tournament structure sync - runs every 12 hours
   */
  @Cron('0 */12 * * *')
  async scheduleTournamentStructureSync(): Promise<void> {
    await this.queueTournamentStructureSync();
  }

  /**
   * Queue tournament discovery job
   */
  async queueTournamentDiscovery(data?: TournamentDiscoveryJobData): Promise<void> {
    await this.syncQueue.add(SyncJobType.TOURNAMENT_DISCOVERY, data || {}, {
      priority: 1,
    });
  }

  /**
   * Queue competition structure sync
   */
  async queueCompetitionStructureSync(data?: StructureSyncJobData): Promise<void> {
    await this.syncQueue.add(SyncJobType.COMPETITION_STRUCTURE_SYNC, data || {}, {
      priority: 3,
    });
  }

  /**
   * Queue tournament structure sync
   */
  async queueTournamentStructureSync(data?: StructureSyncJobData): Promise<void> {
    await this.syncQueue.add(SyncJobType.TOURNAMENT_STRUCTURE_SYNC, data || {}, {
      priority: 3,
    });
  }

  /**
   * Queue competition game sync
   */
  async queueCompetitionGameSync(data: GameSyncJobData): Promise<void> {
    await this.syncQueue.add(SyncJobType.COMPETITION_GAME_SYNC, data, {
      priority: 5,
    });
  }

  /**
   * Queue tournament game sync
   */
  async queueTournamentGameSync(data: GameSyncJobData): Promise<void> {
    await this.syncQueue.add(SyncJobType.TOURNAMENT_GAME_SYNC, data, {
      priority: 10,
    });
  }

  /**
   * Queue team matching job
   */
  async queueTeamMatching(data: TeamMatchingJobData): Promise<void> {
    await this.syncQueue.add(SyncJobType.TEAM_MATCHING, data, {
      priority: 2,
    });
  }

  /**
   * Schedule dynamic game sync based on event dates and type
   */
  async scheduleDynamicGameSync(tournamentCode: string, tournamentType: number, startDate: Date, endDate: Date): Promise<void> {
    const now = new Date();

    if (tournamentType === 1) {
      // Competition (TypeID 1) - Every 4 hours after played, then daily for 1 week, then weekly for 1 month
      if (startDate <= now && now <= endDate) {
        // During competition - every 4 hours
        for (let i = 0; i < 6; i++) {
          await this.syncQueue.add(
            SyncJobType.COMPETITION_GAME_SYNC,
            { tournamentCode },
            {
              delay: i * 4 * 60 * 60 * 1000, // 4 hours in milliseconds
              priority: 5,
            },
          );
        }
      } else if (now > endDate) {
        // After competition - daily for 1 week, then weekly for 1 month
        const daysSinceEnd = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceEnd <= 7) {
          // Daily sync for first week
          await this.syncQueue.add(
            SyncJobType.COMPETITION_GAME_SYNC,
            { tournamentCode },
            {
              delay: 24 * 60 * 60 * 1000, // 24 hours
              priority: 3,
            },
          );
        } else if (daysSinceEnd <= 30) {
          // Weekly sync for first month
          await this.syncQueue.add(
            SyncJobType.COMPETITION_GAME_SYNC,
            { tournamentCode },
            {
              delay: 7 * 24 * 60 * 60 * 1000, // 7 days
              priority: 2,
            },
          );
        }
      }
    } else if (tournamentType === 0) {
      // Tournament (TypeID 0) - Hourly until event end, then daily for 1 week, then weekly for 1 month
      if (now < endDate) {
        // Before/during tournament - hourly
        const hoursUntilEnd = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        for (let i = 0; i < Math.min(hoursUntilEnd, 48); i++) {
          await this.syncQueue.add(
            SyncJobType.TOURNAMENT_GAME_SYNC,
            { tournamentCode },
            {
              delay: i * 60 * 60 * 1000, // 1 hour in milliseconds
              priority: 10,
            },
          );
        }
      } else {
        // After tournament - same logic as competitions
        const daysSinceEnd = Math.floor((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceEnd <= 7) {
          await this.syncQueue.add(
            SyncJobType.TOURNAMENT_GAME_SYNC,
            { tournamentCode },
            {
              delay: 24 * 60 * 60 * 1000,
              priority: 3,
            },
          );
        } else if (daysSinceEnd <= 30) {
          await this.syncQueue.add(
            SyncJobType.TOURNAMENT_GAME_SYNC,
            { tournamentCode },
            {
              delay: 7 * 24 * 60 * 60 * 1000,
              priority: 2,
            },
          );
        }
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const waiting = await this.syncQueue.getWaiting();
    const active = await this.syncQueue.getActive();
    const completed = await this.syncQueue.getCompleted();
    const failed = await this.syncQueue.getFailed();

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
    };
  }

  /**
   * Get recent jobs from the queue
   */
  async getRecentJobs(limit = 20, status?: string) {
    const jobs = [];

    if (!status || status === 'active') {
      const activeJobs = await this.syncQueue.getActive();
      jobs.push(...activeJobs.slice(0, limit));
    }

    if (!status || status === 'waiting') {
      const waitingJobs = await this.syncQueue.getWaiting();
      jobs.push(...waitingJobs.slice(0, limit));
    }

    if (!status || status === 'completed') {
      const completedJobs = await this.syncQueue.getCompleted();
      jobs.push(...completedJobs.slice(0, limit));
    }

    if (!status || status === 'failed') {
      const failedJobs = await this.syncQueue.getFailed();
      jobs.push(...failedJobs.slice(0, limit));
    }

    // Sort by timestamp (most recent first)
    jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return jobs.slice(0, limit).map((job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      opts: job.opts,
      progress: typeof job.progress === 'function' ? job.progress() : job.progress || 0,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      timestamp: job.timestamp,
      status: this.getJobStatus(job),
    }));
  }

  /**
   * Determine job status based on job properties
   */
  private getJobStatus(job: any): 'waiting' | 'active' | 'completed' | 'failed' {
    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    return 'waiting';
  }
}
