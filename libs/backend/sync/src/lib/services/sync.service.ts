import { InjectQueue, InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Queue, FlowProducer } from 'bullmq';
import {
  TournamentEvent,
  CompetitionEvent,
  TournamentSubEvent,
  CompetitionSubEvent,
  TournamentDraw,
  CompetitionDraw,
} from '@app/models';
import { extractParentId, generateJobId } from '../utils/job.utils';
import {
  GameSyncJobData,
  StructureSyncJobData,
  TournamentStructureSyncJobData,
  SYNC_QUEUE,
  TOURNAMENT_DISCOVERY_QUEUE,
  TEAM_MATCHING_QUEUE,
  JOB_TYPES,
  TeamMatchingJobData,
  TournamentDiscoveryJobData,
  TOURNAMENT_EVENT_QUEUE,
  COMPETITION_EVENT_QUEUE,
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

    @InjectFlowProducer(COMPETITION_EVENT_QUEUE)
    private readonly competitionSyncFlow: FlowProducer,

    @InjectFlowProducer(TOURNAMENT_EVENT_QUEUE)
    private readonly tournamentSyncFlow: FlowProducer,
  ) {}

  /**
   * Get all queue instances as an array for easy iteration
   */
  private getAllQueues(): Queue[] {
    return [this.syncQueue, this.tournamentDiscoveryQueue, this.competitionEventQueue, this.tournamentEventQueue, this.teamMatchingQueue];
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
   * Uses count methods for better performance during active syncs
   */
  async getQueueStatsByName() {
    const queueMap = this.getQueueMap();

    // Fetch stats for all queues in parallel
    const statsEntries = await Promise.all(
      Object.entries(queueMap).map(async ([queueName, queue]) => {
        const [waitingCount, activeCount, completedCount, failedCount] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        return [
          queueName,
          {
            waiting: waitingCount,
            active: activeCount,
            completed: completedCount,
            failed: failedCount,
          },
        ] as const;
      }),
    );

    return Object.fromEntries(statsEntries);
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
   * Queue sync for a specific event by its internal ID
   */
  async queueEventSync(eventId: string, includeSubComponents = false): Promise<void> {
    // Look up the event by internal ID to determine type
    const tournamentEvent = await TournamentEvent.findOne({ where: { id: eventId } });
    const competitionEvent = !tournamentEvent ? await CompetitionEvent.findOne({ where: { id: eventId } }) : null;

    const event = tournamentEvent || competitionEvent;
    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    const eventType = tournamentEvent ? 'tournament' : 'competition';
    // Only pass internal ID - the service will load visual codes from the model
    const data = { eventId, includeSubComponents };
    const jobId = generateJobId(eventType, 'event', eventId);
    const jobName = jobId;

    if (includeSubComponents) {
      if (eventType === 'competition') {
        await this.competitionSyncFlow.add({ name: jobName, queueName: COMPETITION_EVENT_QUEUE, data, opts: { jobId, priority: 4 } });
      } else {
        await this.tournamentSyncFlow.add({ name: jobName, queueName: TOURNAMENT_EVENT_QUEUE, data, opts: { jobId, priority: 4 } });
      }
    } else {
      if (eventType === 'competition') {
        await this.competitionEventQueue.add(jobName, data, { jobId, priority: 4 });
      } else {
        await this.tournamentEventQueue.add(jobName, data, { jobId, priority: 4 });
      }
    }
  }

  /**
   * Queue sync for a specific sub-event by its internal ID
   */
  async queueSubEventSync(subEventId: string, includeSubComponents = false): Promise<void> {
    // Look up the sub-event by internal ID to determine type
    const tournamentSubEvent = await TournamentSubEvent.findOne({
      where: { id: subEventId },
    });
    const competitionSubEvent = !tournamentSubEvent
      ? await CompetitionSubEvent.findOne({ where: { id: subEventId } })
      : null;

    if (tournamentSubEvent) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { subEventId, includeSubComponents };
      const jobId = generateJobId('tournament', 'subevent', subEventId);
      await (includeSubComponents
        ? this.tournamentSyncFlow.add({ name: jobId, queueName: TOURNAMENT_EVENT_QUEUE, data, opts: { jobId, priority: 5 } })
        : this.tournamentEventQueue.add(jobId, data, { jobId, priority: 5 }));
    } else if (competitionSubEvent) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { subEventId, includeSubComponents };
      const jobId = generateJobId('competition', 'subevent', subEventId);
      await (includeSubComponents
        ? this.competitionSyncFlow.add({ name: jobId, queueName: COMPETITION_EVENT_QUEUE, data, opts: { jobId, priority: 5 } })
        : this.competitionEventQueue.add(jobId, data, { jobId, priority: 5 }));
    } else {
      throw new NotFoundException(`Sub-event with id ${subEventId} not found`);
    }
  }

  /**
   * Queue sync for a specific draw by its internal ID
   */
  async queueDrawSync(drawId: string, includeSubComponents = false): Promise<void> {
    // Look up the draw by internal ID to determine type
    const tournamentDraw = await TournamentDraw.findOne({
      where: { id: drawId },
    });
    const competitionDraw = !tournamentDraw
      ? await CompetitionDraw.findOne({ where: { id: drawId } })
      : null;

    if (tournamentDraw) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { drawId, includeSubComponents };
      const jobId = generateJobId('tournament', 'draw', drawId);
      await (includeSubComponents
        ? this.tournamentSyncFlow.add({ name: jobId, queueName: TOURNAMENT_EVENT_QUEUE, data, opts: { jobId, priority: 6 } })
        : this.tournamentEventQueue.add(jobId, data, { jobId, priority: 6 }));
    } else if (competitionDraw) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { drawId, includeSubComponents };
      const jobId = generateJobId('competition', 'draw', drawId);
      await (includeSubComponents
        ? this.competitionSyncFlow.add({ name: jobId, queueName: COMPETITION_EVENT_QUEUE, data, opts: { jobId, priority: 6 } })
        : this.competitionEventQueue.add(jobId, data, { jobId, priority: 6 }));
    } else {
      throw new NotFoundException(`Draw with id ${drawId} not found`);
    }
  }

  /**
   * Queue sync for specific games by draw internal ID
   */
  async queueGameSync(drawId: string, matchCodes?: string[]): Promise<void> {
    // Look up the draw by internal ID to determine type
    const tournamentDraw = await TournamentDraw.findOne({
      where: { id: drawId },
    });
    const competitionDraw = !tournamentDraw
      ? await CompetitionDraw.findOne({ where: { id: drawId } })
      : null;

    if (tournamentDraw) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { drawId, matchCodes };
      await this.tournamentEventQueue.add(JOB_TYPES.TOURNAMENT_GAME_SYNC, data, { priority: 8 });
    } else if (competitionDraw) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { drawId, matchCodes };
      await this.competitionEventQueue.add(JOB_TYPES.COMPETITION_GAME_SYNC, data, { priority: 8 });
    } else {
      throw new NotFoundException(`Draw with id ${drawId} not found`);
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
   * Uses count methods for better performance during active syncs
   */
  async getQueueStats() {
    // Get stats from all queues in parallel for better performance
    const queues = this.getAllQueues();

    const statsPromises = queues.map(async (queue) => {
      // Use count methods instead of fetching all jobs - much faster
      const [waitingCount, activeCount, completedCount, failedCount] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      return {
        waiting: waitingCount,
        active: activeCount,
        completed: completedCount,
        failed: failedCount,
      };
    });

    const allStats = await Promise.all(statsPromises);

    // Aggregate stats from all queues
    return allStats.reduce(
      (total, stats) => ({
        waiting: total.waiting + stats.waiting,
        active: total.active + stats.active,
        completed: total.completed + stats.completed,
        failed: total.failed + stats.failed,
      }),
      { waiting: 0, active: 0, completed: 0, failed: 0 },
    );
  }

  /**
   * Get recent jobs from the queue
   */
  async getRecentJobs(limit?: number | null, status?: string) {
    const jobs = [];
    const queues = this.getAllQueues();

    for (const queue of queues) {
      if (!status || status === 'active') {
        const activeJobs = await queue.getActive();
        jobs.push(...activeJobs.slice(0, limit ?? activeJobs.length));

        // Also get jobs waiting for children - these are parent jobs that spawned child jobs
        // They're technically "active" but in a waiting-children state
        const waitingChildrenJobs = await queue.getWaitingChildren();
        jobs.push(...waitingChildrenJobs.slice(0, limit ?? waitingChildrenJobs.length));
      }

      if (!status || status === 'waiting') {
        // Get regular waiting jobs
        const waitingJobs = await queue.getWaiting();
        jobs.push(...waitingJobs.slice(0, limit ?? waitingJobs.length));

        // Also get prioritized jobs (these are jobs with priority > 0)
        const prioritizedJobs = await queue.getPrioritized();
        jobs.push(...prioritizedJobs.slice(0, limit ?? prioritizedJobs.length));
      }

      if (!status || status === 'completed') {
        const completedJobs = await queue.getCompleted();
        jobs.push(...completedJobs.slice(0, limit ?? completedJobs.length));
      }

      if (!status || status === 'failed') {
        const failedJobs = await queue.getFailed();
        jobs.push(...failedJobs.slice(0, limit ?? failedJobs.length));
      }
    }

    // Sort by timestamp (most recent first)
    jobs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const result = jobs.slice(0, limit ?? jobs.length).map((job) => ({
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
