import { InjectQueue, InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue, FlowProducer } from 'bullmq';
import { TournamentEvent, CompetitionEvent } from '@app/models';
import { extractParentId, generateJobId } from '../utils/job.utils';
import {
  GameSyncJobData,
  StructureSyncJobData,
  TournamentStructureSyncJobData,
  SYNC_QUEUE,
  TOURNAMENT_DISCOVERY_QUEUE,
  COMPETITION_EVENT_QUEUE,
  TOURNAMENT_EVENT_QUEUE,
  TEAM_MATCHING_QUEUE,
  JOB_TYPES,
  createJobName,
  TeamMatchingJobData,
  TournamentDiscoveryJobData,
} from '../queues/sync.queue';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  constructor(
    @InjectQueue(SYNC_QUEUE)
    private readonly syncQueue: Queue,

    @InjectQueue(TOURNAMENT_DISCOVERY_QUEUE)
    private readonly tournamentDiscoveryQueue: Queue,

    @InjectQueue(COMPETITION_EVENT_QUEUE)
    private readonly competitionEventQueue: Queue,

    @InjectQueue(TOURNAMENT_EVENT_QUEUE)
    private readonly tournamentEventQueue: Queue,

    @InjectQueue(TEAM_MATCHING_QUEUE)
    private readonly teamMatchingQueue: Queue,

    @InjectFlowProducer('competition-sync')
    private readonly competitionSyncFlow: FlowProducer,

    @InjectFlowProducer('tournament-sync')
    private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  /**
   * Get all queue instances as an array for easy iteration
   */
  private getAllQueues(): Queue[] {
    return [this.syncQueue, this.tournamentDiscoveryQueue, this.competitionEventQueue, this.tournamentEventQueue, this.teamMatchingQueue];
  }

  /**
   * Determine if a tournament code represents a competition or tournament event
   * by checking the database models
   */
  private async determineEventType(tournamentCode: string): Promise<'tournament' | 'competition' | null> {
    try {
      // First check if it's a tournament
      const tournamentEvent = await TournamentEvent.findOne({
        where: { visualCode: tournamentCode },
      });

      if (tournamentEvent) {
        this.logger.debug(`Found tournament event for code: ${tournamentCode}`);
        return 'tournament';
      }

      // Then check if it's a competition
      const competitionEvent = await CompetitionEvent.findOne({
        where: { visualCode: tournamentCode },
      });

      if (competitionEvent) {
        this.logger.debug(`Found competition event for code: ${tournamentCode}`);
        return 'competition';
      }

      this.logger.warn(`No event found for tournament code: ${tournamentCode}`);
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to determine event type for ${tournamentCode}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Determine event type with fallback to string matching for backward compatibility
   */
  private async getEventType(tournamentCode: string): Promise<'tournament' | 'competition'> {
    const eventType = await this.determineEventType(tournamentCode);

    if (eventType) {
      return eventType;
    }

    // Fallback to the old string matching approach for backward compatibility
    this.logger.warn(`Falling back to string matching for tournament code: ${tournamentCode}`);
    const isCompetition = tournamentCode.includes('competition') || tournamentCode.includes('comp');
    return isCompetition ? 'competition' : 'tournament';
  }

  /**
   * Get queue names mapped to their instances
   */
  getQueueMap(): Record<string, Queue> {
    return {
      [SYNC_QUEUE]: this.syncQueue,
      [TOURNAMENT_DISCOVERY_QUEUE]: this.tournamentDiscoveryQueue,
      [COMPETITION_EVENT_QUEUE]: this.competitionEventQueue,
      [TOURNAMENT_EVENT_QUEUE]: this.tournamentEventQueue,
      [TEAM_MATCHING_QUEUE]: this.teamMatchingQueue,
    };
  }

  /**
   * Get individual queue statistics by name
   */
  async getQueueStatsByName() {
    const queueMap = this.getQueueMap();
    const stats: Record<string, { waiting: number; active: number; completed: number; failed: number }> = {};

    for (const [queueName, queue] of Object.entries(queueMap)) {
      const waiting = await queue.getWaiting();
      const prioritized = await queue.getPrioritized();
      const active = await queue.getActive();
      // Use getCompletedCount() and getFailedCount() to get actual counts
      const completedCount = await queue.getCompletedCount();
      const failedCount = await queue.getFailedCount();

      stats[queueName] = {
        waiting: waiting.length + prioritized.length, // Include prioritized jobs in waiting count
        active: active.length,
        completed: completedCount,
        failed: failedCount,
      };
    }

    return stats;
  }

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
    await this.tournamentDiscoveryQueue.add(JOB_TYPES.TOURNAMENT_DISCOVERY, data || {}, {
      priority: 1,
    });
  }

  /**
   * Queue competition structure sync
   */
  async queueCompetitionStructureSync(data?: StructureSyncJobData): Promise<void> {
    await this.competitionEventQueue.add(JOB_TYPES.COMPETITION_STRUCTURE_SYNC, data || {}, {
      priority: 3,
    });
  }

  /**
   * Queue tournament structure sync
   */
  async queueTournamentStructureSync(data?: TournamentStructureSyncJobData): Promise<void> {
    await this.tournamentEventQueue.add(JOB_TYPES.TOURNAMENT_STRUCTURE_SYNC, data || {}, {
      priority: 3,
    });
  }

  /**
   * Queue competition game sync
   */
  async queueCompetitionGameSync(data: GameSyncJobData): Promise<void> {
    await this.competitionEventQueue.add(JOB_TYPES.COMPETITION_GAME_SYNC, data, {
      priority: 5,
    });
  }

  /**
   * Queue tournament game sync
   */
  async queueTournamentGameSync(data: GameSyncJobData): Promise<void> {
    await this.tournamentEventQueue.add(JOB_TYPES.TOURNAMENT_GAME_SYNC, data, {
      priority: 10,
    });
  }

  /**
   * Queue team matching job
   */
  async queueTeamMatching(data: TeamMatchingJobData): Promise<void> {
    await this.teamMatchingQueue.add(JOB_TYPES.TEAM_MATCHING, data, {
      priority: 2,
    });
  }

  /**
   * Queue sync for a specific event with granular control
   */
  async queueEventSync(tournamentCode: string, eventCode: string, includeSubComponents = false): Promise<void> {
    const data = { tournamentCode, eventCodes: [eventCode], includeSubComponents };

    // Determine if it's a tournament or competition by checking the database
    const eventType = await this.getEventType(tournamentCode);
    const jobId = generateJobId(eventType, 'event', tournamentCode, eventCode);
    const jobName = generateJobId(eventType, 'event', tournamentCode, eventCode);

    if (includeSubComponents) {
      // Use FlowProducer when creating jobs that will have children
      if (eventType === 'competition') {
        await this.competitionSyncFlow.add({
          name: jobName,
          queueName: COMPETITION_EVENT_QUEUE,
          data,
          opts: {
            jobId,
            priority: 4,
          },
        });
      } else {
        await this.tournamentSyncFlow.add({
          name: jobName,
          queueName: TOURNAMENT_EVENT_QUEUE,
          data,
          opts: {
            jobId,
            priority: 4,
          },
        });
      }
    } else {
      // Use regular Queue.add() for jobs without children
      if (eventType === 'competition') {
        await this.competitionEventQueue.add(jobName, data, {
          jobId,
          priority: 4,
        });
      } else {
        await this.tournamentEventQueue.add(jobName, data, {
          jobId,
          priority: 4,
        });
      }
    }
  }

  /**
   * Queue sync for a specific sub-event with granular control
   */
  async queueSubEventSync(tournamentCode: string, eventCode: string, subEventCode?: string, includeSubComponents = false): Promise<void> {
    const data = {
      tournamentCode,
      eventCodes: [eventCode],
      subEventCodes: subEventCode ? [subEventCode] : undefined,
      includeSubComponents,
    };

    const eventType = await this.getEventType(tournamentCode);
    const jobId = generateJobId(eventType, 'subevent', tournamentCode, eventCode, subEventCode || '');
    const jobName = generateJobId(eventType, 'subevent', tournamentCode, eventCode, subEventCode || '');

    if (includeSubComponents) {
      // Use FlowProducer when creating jobs that will have children
      if (eventType === 'competition') {
        await this.competitionSyncFlow.add({
          name: jobName,
          queueName: COMPETITION_EVENT_QUEUE,
          data,
          opts: {
            jobId,
            priority: 5,
          },
        });
      } else {
        await this.tournamentSyncFlow.add({
          name: jobName,
          queueName: TOURNAMENT_EVENT_QUEUE,
          data,
          opts: {
            jobId,
            priority: 5,
          },
        });
      }
    } else {
      // Use regular Queue.add() for jobs without children
      if (eventType === 'competition') {
        await this.competitionEventQueue.add(jobName, data, {
          jobId,
          priority: 5,
        });
      } else {
        await this.tournamentEventQueue.add(jobName, data, {
          jobId,
          priority: 5,
        });
      }
    }
  }

  /**
   * Queue sync for a specific draw with its games
   */
  async queueDrawSync(tournamentCode: string, drawCode: string, includeSubComponents = false): Promise<void> {
    const data = { tournamentCode, drawCode, includeSubComponents };

    const eventType = await this.getEventType(tournamentCode);
    const jobId = generateJobId(eventType, 'draw', tournamentCode, drawCode);
    const jobName = generateJobId(eventType, 'draw', tournamentCode, drawCode);

    if (includeSubComponents) {
      // Use FlowProducer when creating jobs that will have children
      if (eventType === 'competition') {
        await this.competitionSyncFlow.add({
          name: jobName,
          queueName: COMPETITION_EVENT_QUEUE,
          data,
          opts: {
            jobId,
            priority: 6,
          },
        });
      } else {
        await this.tournamentSyncFlow.add({
          name: jobName,
          queueName: TOURNAMENT_EVENT_QUEUE,
          data,
          opts: {
            jobId,
            priority: 6,
          },
        });
      }
    } else {
      // Use regular Queue.add() for jobs without children
      if (eventType === 'competition') {
        await this.competitionEventQueue.add(jobName, data, {
          jobId,
          priority: 6,
        });
      } else {
        await this.tournamentEventQueue.add(jobName, data, {
          jobId,
          priority: 6,
        });
      }
    }
  }

  /**
   * Queue sync for specific games
   */
  async queueGameSync(tournamentCode: string, eventCodeOrDrawCode?: string, drawCode?: string, matchCodes?: string[]): Promise<void> {
    // Handle both signatures: (tournamentCode, drawCode, matchCodes) and (tournamentCode, eventCode, drawCode, matchCodes)
    let eventCode: string | undefined;
    let finalDrawCode: string | undefined;
    let finalMatchCodes: string[] | undefined;

    if (typeof drawCode === 'string') {
      // Full signature: (tournamentCode, eventCode, drawCode, matchCodes)
      eventCode = eventCodeOrDrawCode;
      finalDrawCode = drawCode;
      finalMatchCodes = matchCodes;
    } else {
      // Short signature: (tournamentCode, drawCode, matchCodes)
      finalDrawCode = eventCodeOrDrawCode;
      finalMatchCodes = drawCode as string[] | undefined;
    }
    const data: GameSyncJobData = {
      tournamentCode,
      eventCode,
      drawCode: finalDrawCode,
      matchCodes: finalMatchCodes,
    };

    // Determine if it's a tournament or competition by checking the database
    const eventType = await this.getEventType(tournamentCode);

    if (eventType === 'competition') {
      await this.competitionEventQueue.add(JOB_TYPES.COMPETITION_GAME_SYNC, data, {
        priority: 8,
      });
    } else {
      await this.tournamentEventQueue.add(JOB_TYPES.TOURNAMENT_GAME_SYNC, data, {
        priority: 8,
      });
    }
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
          await this.competitionEventQueue.add(
            JOB_TYPES.COMPETITION_GAME_SYNC,
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
          await this.competitionEventQueue.add(
            JOB_TYPES.COMPETITION_GAME_SYNC,
            { tournamentCode },
            {
              delay: 24 * 60 * 60 * 1000, // 24 hours
              priority: 3,
            },
          );
        } else if (daysSinceEnd <= 30) {
          // Weekly sync for first month
          await this.competitionEventQueue.add(
            JOB_TYPES.COMPETITION_GAME_SYNC,
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
          await this.tournamentEventQueue.add(
            JOB_TYPES.TOURNAMENT_GAME_SYNC,
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
          await this.tournamentEventQueue.add(
            JOB_TYPES.TOURNAMENT_GAME_SYNC,
            { tournamentCode },
            {
              delay: 24 * 60 * 60 * 1000,
              priority: 3,
            },
          );
        } else if (daysSinceEnd <= 30) {
          await this.tournamentEventQueue.add(
            JOB_TYPES.TOURNAMENT_GAME_SYNC,
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
    // Get stats from all queues and aggregate them
    const queues = this.getAllQueues();

    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const queue of queues) {
      const waiting = await queue.getWaiting();
      const prioritized = await queue.getPrioritized();
      const active = await queue.getActive();
      // Use getCompletedCount() to get the actual count instead of length of limited array
      const completedCount = await queue.getCompletedCount();
      const failedCount = await queue.getFailedCount();

      totalWaiting += waiting.length + prioritized.length; // Include prioritized jobs in waiting count
      totalActive += active.length;
      totalCompleted += completedCount;
      totalFailed += failedCount;
    }

    return {
      waiting: totalWaiting,
      active: totalActive,
      completed: totalCompleted,
      failed: totalFailed,
    };
  }

  /**
   * Get recent jobs from the queue
   */
  async getRecentJobs(limit = 20, status?: string) {
    const jobs = [];
    const queues = this.getAllQueues();

    for (const queue of queues) {
      if (!status || status === 'active') {
        const activeJobs = await queue.getActive();
        jobs.push(...activeJobs.slice(0, limit));
      }

      if (!status || status === 'waiting') {
        // Get regular waiting jobs
        const waitingJobs = await queue.getWaiting();
        jobs.push(...waitingJobs.slice(0, limit));

        // Also get prioritized jobs (these are jobs with priority > 0)
        const prioritizedJobs = await queue.getPrioritized();
        jobs.push(...prioritizedJobs.slice(0, limit));
      }

      if (!status || status === 'completed') {
        const completedJobs = await queue.getCompleted();
        jobs.push(...completedJobs.slice(0, limit));
      }

      if (!status || status === 'failed') {
        const failedJobs = await queue.getFailed();
        jobs.push(...failedJobs.slice(0, limit));
      }
    }

    // Sort by timestamp (most recent first)
    jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const result = jobs.slice(0, limit).map((job) => ({
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
      parentId: extractParentId(job),
    }));

    return result;
  }

  /**
   * Determine job status based on job properties
   */
  private getJobStatus(job: { failedReason?: string; finishedOn?: number; processedOn?: number }): 'waiting' | 'active' | 'completed' | 'failed' {
    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    return 'waiting';
  }
}
