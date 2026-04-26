import { InjectQueue, InjectFlowProducer } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob as NestCronJob } from 'cron';
import { Queue, FlowProducer } from 'bullmq';
import {
  TournamentEvent,
  CompetitionEvent,
  TournamentSubEvent,
  CompetitionSubEvent,
  TournamentDraw,
  CompetitionDraw,
  CompetitionEncounter,
  CronJob,
} from '@app/models';
import { extractParentId, generateJobId } from '../utils/job.utils';
import {
  GameSyncJobData,
  JOB_TYPES,
  RANKING_CALC_QUEUE,
  RANKING_SYNC_QUEUE,
  RankingCalcInitJobData,
  RankingSyncInitJobData,
  StructureSyncJobData,
  SYNC_QUEUE,
  TEAM_MATCHING_QUEUE,
  TeamMatchingJobData,
  TOURNAMENT_DISCOVERY_QUEUE,
  TournamentAddByCodeJobData,
  TOURNAMENT_EVENT_QUEUE,
  COMPETITION_EVENT_QUEUE,
  TournamentDiscoveryJobData,
  TournamentRankingRecalcJobData,
  TournamentScrapeEventJobData,
  TournamentScrapeYearJobData,
  TournamentScrapeYearCleanupJobData,
  TournamentSyncJobData,
} from '../queues/sync.queue';
import { RankingSystem } from '@app/models';
import { RankingSystems } from '@app/models-enum';

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);

  /** Maps jobFunction name → bound handler */
  private readonly cronHandlers: Record<string, () => Promise<void>>;

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

    @InjectQueue(RANKING_SYNC_QUEUE)
    private readonly rankingSyncQueue: Queue,

    @InjectQueue(RANKING_CALC_QUEUE)
    private readonly rankingCalcQueue: Queue,

    @InjectFlowProducer(COMPETITION_EVENT_QUEUE)
    private readonly competitionSyncFlow: FlowProducer,

    @InjectFlowProducer(TOURNAMENT_EVENT_QUEUE)
    private readonly tournamentSyncFlow: FlowProducer,

    private readonly schedulerRegistry: SchedulerRegistry,
  ) {
    this.cronHandlers = {
      scheduleTournamentDiscovery: () => this.queueTournamentDiscovery(),
      scheduleCompetitionSync: () => this.queueCompetitionSync(),
      scheduleTournamentSync: () => this.queueTournamentSync(),
      scheduleRankingSync: () => this.queueRankingSync(),
      scheduleRankingCalc: () => this.queueRankingCalc(),
    };
  }

  /**
   * On module init: register dynamic cron jobs from database
   */
  async onModuleInit(): Promise<void> {
    await this.registerAllCronJobs();
  }

  /**
   * Register all active CronJob records as dynamic cron jobs
   */
  async registerAllCronJobs(): Promise<void> {
    const cronJobs = await CronJob.find({ where: { active: true } });
    for (const cronJob of cronJobs) {
      this.registerCronJob(cronJob);
    }
  }

  /**
   * Register a single CronJob as a dynamic cron with NestJS SchedulerRegistry
   */
  private registerCronJob(cronJob: CronJob): void {
    const jobName = cronJob.meta?.jobName;
    if (!jobName) {
      this.logger.warn(`No jobName in meta for cron job: ${cronJob.name}`);
      return;
    }
    const handler = this.cronHandlers[jobName];
    if (!handler) {
      this.logger.warn(`No handler found for cron job function: ${jobName}`);
      return;
    }

    // Remove existing cron if already registered (for re-registration after update)
    try {
      this.schedulerRegistry.deleteCronJob(cronJob.name);
    } catch {
      // Not registered yet — ignore
    }

    const job = new NestCronJob(cronJob.cronTime, async () => {
      await this.executeCronJob(cronJob.name, handler);
    });

    this.schedulerRegistry.addCronJob(cronJob.name, job);
    job.start();
    this.logger.log(`Registered cron job: ${cronJob.name} (${cronJob.cronTime})`);
  }

  /**
   * Execute a cron job, updating tracking fields in the database
   */
  private async executeCronJob(name: string, handler: () => Promise<void>): Promise<void> {
    const cronJob = await CronJob.findOne({ where: { name } });
    if (!cronJob || !cronJob.active) return;

    cronJob.amount = (cronJob.amount ?? 0) + 1;
    cronJob.lastRun = new Date();
    await cronJob.save();

    try {
      await handler();
    } catch (error) {
      this.logger.error(`Cron job ${name} failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      cronJob.amount = Math.max((cronJob.amount ?? 1) - 1, 0);
      await cronJob.save();
    }
  }

  /**
   * Trigger a specific cron job by name (manual trigger)
   */
  async triggerCronJob(name: string): Promise<void> {
    const cronJob = await CronJob.findOne({ where: { name } });
    if (!cronJob) {
      throw new NotFoundException(`Cron job '${name}' not found`);
    }

    const jobName = cronJob.meta?.jobName;
    if (!jobName) {
      throw new NotFoundException(`No jobName in meta for cron job: ${name}`);
    }
    const handler = this.cronHandlers[jobName];
    if (!handler) {
      throw new NotFoundException(`No handler for cron job function: ${jobName}`);
    }

    await this.executeCronJob(name, handler);
  }

  /**
   * Update a cron job's settings and re-register it
   */
  async updateCronJob(id: string, updates: { cronTime?: string; active?: boolean }): Promise<CronJob> {
    const cronJob = await CronJob.findOne({ where: { id } });
    if (!cronJob) {
      throw new NotFoundException(`Cron job with id ${id} not found`);
    }

    if (updates.cronTime !== undefined) {
      cronJob.cronTime = updates.cronTime;
    }
    if (updates.active !== undefined) {
      cronJob.active = updates.active;
    }

    await cronJob.save();

    // Re-register or unregister based on active state
    if (cronJob.active) {
      this.registerCronJob(cronJob);
    } else {
      try {
        this.schedulerRegistry.deleteCronJob(cronJob.name);
      } catch {
        // Not registered — ignore
      }
    }

    return cronJob;
  }

  /**
   * Get all queue instances as an array for easy iteration
   */
  private getAllQueues(): Queue[] {
    return [
      this.syncQueue,
      this.tournamentDiscoveryQueue,
      this.competitionEventQueue,
      this.tournamentEventQueue,
      this.teamMatchingQueue,
      this.rankingSyncQueue,
      this.rankingCalcQueue,
    ];
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
      [RANKING_SYNC_QUEUE]: this.rankingSyncQueue,
      [RANKING_CALC_QUEUE]: this.rankingCalcQueue,
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
        const [waitingCount, prioritizedCount, waitingChildrenCount, activeCount, completedCount, failedCount] = await Promise.all([
          queue.getWaitingCount(),
          queue.getPrioritizedCount(),
          queue.getWaitingChildrenCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
        ]);

        return [
          queueName,
          {
            waiting: waitingCount + prioritizedCount + waitingChildrenCount,
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
   * Enqueue calculation jobs for all non-VISUAL ranking systems that are due
   */
  async queueRankingCalc(options?: { startDate?: Date; stopDate?: Date, type?: RankingSystems }): Promise<void> {
    // Use the canonical "currently active BVL system" lookup so this stays
    // in sync with how publications are bucketed elsewhere.
    const system = await RankingSystem.findActiveSystem(new Date(), options?.type ?? RankingSystems.BVL);

    if (!system) {
      this.logger.warn('queueRankingCalc: no active BVL ranking system for current date — nothing queued');
      return;
    }

    const snapshotDates = this.getNextSnapshotDates(system, options);
    for (const { calcDate, isUpdateDate } of snapshotDates) {
      const data: RankingCalcInitJobData = {
        systemId: system.id,
        calcDate: calcDate.toISOString(),
        isUpdateDate,
        metadata: {
          displayName: `Ranking calc: ${system.name} (${calcDate.toISOString().slice(0, 10)})`,
        },
      };
      await this.rankingCalcQueue.add(JOB_TYPES.RANKING_CALC_INIT, data, { priority: 10 });
      this.logger.log(`Queued ranking calc for ${system.name} on ${calcDate.toISOString()}`);
    }
  }

  private getNextSnapshotDates(
    system: RankingSystem,
    options?: { startDate?: Date; stopDate?: Date },
  ): Array<{ calcDate: Date; isUpdateDate: boolean }> {
    const { calculationIntervalAmount, calculationIntervalUnit, calculationDayOfWeek } = system;

    if (!calculationIntervalAmount || !calculationIntervalUnit) return [];

    const stopDay = options?.stopDate ? new Date(options.stopDate) : new Date();

    // Start from provided startDate, or last calculation, or 1 interval ago
    const fromDate =
      options?.startDate ?? system.calculationLastUpdate ?? new Date(Date.now() - calculationIntervalAmount * this.unitToMs(calculationIntervalUnit));

    let cursor = new Date(fromDate);
    // Advance past the last-calculated date by one interval
    if (system.calculationLastUpdate && !options?.startDate) {
      cursor = new Date(cursor.getTime() + calculationIntervalAmount * this.unitToMs(calculationIntervalUnit));
    }

    // Snap to the correct day of week if configured
    if (calculationDayOfWeek !== undefined && calculationDayOfWeek !== null) {
      cursor = this.snapToDayOfWeek(cursor, calculationDayOfWeek);
    }

    const result: Array<{ calcDate: Date; isUpdateDate: boolean }> = [];

    while (cursor <= stopDay) {
      result.push({ calcDate: new Date(cursor), isUpdateDate: this.isUpdateDue(cursor, system) });

      cursor = new Date(cursor.getTime() + calculationIntervalAmount * this.unitToMs(calculationIntervalUnit));
      if (calculationDayOfWeek !== undefined && calculationDayOfWeek !== null) {
        cursor = this.snapToDayOfWeek(cursor, calculationDayOfWeek);
      }
    }

    return result;
  }

  private isUpdateDue(date: Date, system: RankingSystem): boolean {
    const { updateIntervalAmount, updateIntervalUnit, updateDayOfWeek, updateLastUpdate } = system;
    if (!updateIntervalAmount || !updateIntervalUnit) return false;

    const nextDue = updateLastUpdate ? new Date(updateLastUpdate.getTime() + updateIntervalAmount * this.unitToMs(updateIntervalUnit)) : new Date(0);

    if (date < nextDue) return false;

    if (updateDayOfWeek !== undefined && updateDayOfWeek !== null) {
      return date.getDay() === updateDayOfWeek;
    }

    return true;
  }

  private snapToDayOfWeek(date: Date, targetDay: number): Date {
    const d = new Date(date);
    while (d.getDay() !== targetDay) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  private unitToMs(unit: string): number {
    switch (unit) {
      case 'days':
        return 86400000;
      case 'weeks':
        return 7 * 86400000;
      case 'months':
        return 30 * 86400000; // approximate
      default:
        return 86400000;
    }
  }

  /**
   * Queue BBF Rating ranking sync init job
   */
  async queueRankingSync(data?: RankingSyncInitJobData): Promise<void> {
    await this.rankingSyncQueue.add(JOB_TYPES.RANKING_SYNC_INIT, data ?? {}, {
      priority: 5,
    });
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
   * Queue adding a tournament by visual code
   */
  async queueTournamentAddByCode(data: TournamentAddByCodeJobData): Promise<void> {
    await this.tournamentDiscoveryQueue.add(JOB_TYPES.TOURNAMENT_ADD_BY_CODE, data, {
      priority: 1,
    });
  }

  /**
   * Queue scraping of the badmintonvlaanderen.be calendar for a given year.
   * Dispatches individual TOURNAMENT_SCRAPE_EVENT jobs for each calendar event found.
   */
  async queueTournamentScrapeYear(data: TournamentScrapeYearJobData): Promise<void> {
    await this.tournamentDiscoveryQueue.add(JOB_TYPES.TOURNAMENT_SCRAPE_YEAR, data, {
      priority: 2,
    });
  }

  /**
   * Queue a cleanup job to mark official=false for tournaments in a year not found on the calendar.
   */
  async queueTournamentScrapeYearCleanup(data: TournamentScrapeYearCleanupJobData): Promise<void> {
    await this.tournamentDiscoveryQueue.add(JOB_TYPES.TOURNAMENT_SCRAPE_YEAR_CLEANUP, data, {
      priority: 2,
    });
  }

  /**
   * Queue scraping of a single badmintonvlaanderen.be calendar event page.
   */
  async queueTournamentScrapeEvent(data: TournamentScrapeEventJobData): Promise<void> {
    await this.tournamentDiscoveryQueue.add(JOB_TYPES.TOURNAMENT_SCRAPE_EVENT, data, {
      priority: 2,
    });
  }

  /**
   * Queue competition structure sync
   */
  async queueCompetitionSync(data?: StructureSyncJobData): Promise<void> {
    await this.competitionEventQueue.add(JOB_TYPES.COMPETITION_STRUCTURE_SYNC, data || {}, {
      priority: 3,
    });
  }

  /**
   * Queue tournament structure sync
   */
  async queueTournamentSync(data?: TournamentSyncJobData): Promise<void> {
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
   * Queue tournament ranking point recalculation
   */
  async queueTournamentRankingRecalc(data: TournamentRankingRecalcJobData): Promise<void> {
    await this.tournamentEventQueue.add(JOB_TYPES.TOURNAMENT_RANKING_RECALC, data, {
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
   * Remove any existing job with the same ID to allow re-queueing.
   * This handles stale jobs stuck in waiting-children state from previous runs,
   * which would otherwise silently block new jobs with the same deterministic ID.
   */
  private async cleanupExistingJob(queue: Queue, jobId: string): Promise<void> {
    try {
      const existingJob = await queue.getJob(jobId);
      if (existingJob) {
        const state = await existingJob.getState();
        if (state === 'active') {
          this.logger.warn(`Cannot remove active job ${jobId}, skipping cleanup`);
          return;
        }
        await existingJob.remove({ removeChildren: true });
        this.logger.log(`Removed stale ${state} job ${jobId} (with children) to allow re-queueing`);
      }
    } catch (error) {
      // Job removal can fail if children are locked - log and continue
      this.logger.warn(`Failed to cleanup existing job ${jobId}: ${error instanceof Error ? error.message : error}`);
    }
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

    // Clean up any stale job with the same ID (e.g., stuck in waiting-children from a previous run)
    const queue = eventType === 'competition' ? this.competitionEventQueue : this.tournamentEventQueue;
    await this.cleanupExistingJob(queue, jobId);

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
    const competitionSubEvent = !tournamentSubEvent ? await CompetitionSubEvent.findOne({ where: { id: subEventId } }) : null;

    if (tournamentSubEvent) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { subEventId, includeSubComponents };
      const jobId = generateJobId('tournament', 'subevent', subEventId);
      await this.cleanupExistingJob(this.tournamentEventQueue, jobId);
      await (includeSubComponents
        ? this.tournamentSyncFlow.add({ name: jobId, queueName: TOURNAMENT_EVENT_QUEUE, data, opts: { jobId, priority: 5 } })
        : this.tournamentEventQueue.add(jobId, data, { jobId, priority: 5 }));
    } else if (competitionSubEvent) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { subEventId, includeSubComponents };
      const jobId = generateJobId('competition', 'subevent', subEventId);
      await this.cleanupExistingJob(this.competitionEventQueue, jobId);
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
    const competitionDraw = !tournamentDraw ? await CompetitionDraw.findOne({ where: { id: drawId } }) : null;

    if (tournamentDraw) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { drawId, includeSubComponents };
      const jobId = generateJobId('tournament', 'draw', drawId);
      await this.cleanupExistingJob(this.tournamentEventQueue, jobId);
      await (includeSubComponents
        ? this.tournamentSyncFlow.add({ name: jobId, queueName: TOURNAMENT_EVENT_QUEUE, data, opts: { jobId, priority: 6 } })
        : this.tournamentEventQueue.add(jobId, data, { jobId, priority: 6 }));
    } else if (competitionDraw) {
      // Only pass internal ID - the service will load visual codes from the model
      const data = { drawId, includeSubComponents };
      const jobId = generateJobId('competition', 'draw', drawId);
      await this.cleanupExistingJob(this.competitionEventQueue, jobId);
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
    const competitionDraw = !tournamentDraw ? await CompetitionDraw.findOne({ where: { id: drawId } }) : null;

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
   * Queue sync for a specific encounter by its internal ID
   */
  async queueEncounterSync(encounterId: string): Promise<void> {
    // Look up the encounter by internal ID with all relations needed to get visual codes
    const encounter = await CompetitionEncounter.findOne({
      where: { id: encounterId },
      relations: ['drawCompetition', 'drawCompetition.competitionSubEvent', 'drawCompetition.competitionSubEvent.competitionEvent'],
    });

    if (!encounter) {
      throw new NotFoundException(`Encounter with id ${encounterId} not found`);
    }

    const draw = encounter.drawCompetition;
    const subEvent = draw?.competitionSubEvent;
    const event = subEvent?.competitionEvent;

    if (!draw || !event || !encounter.visualCode) {
      throw new NotFoundException(`Encounter ${encounterId} is missing required relations or visual code`);
    }

    // Build the data structure expected by CompetitionEncounterSyncService
    const data = {
      tournamentCode: event.visualCode!,
      drawCode: draw.visualCode!,
      drawId: draw.id,
      encounterCode: encounter.visualCode,
    };

    const jobId = generateJobId('competition', 'encounter', encounterId);
    await this.competitionEventQueue.add(jobId, data, { jobId, priority: 7 });
  }

  /**
   * Get queue statistics
   * Uses count methods for better performance during active syncs
   */
  async getQueueStats() {
    // Get stats from all queues in parallel for better performance
    const queues = this.getAllQueues();

    const statsPromises = queues.map(async (queue) => {
      // Use count methods instead of fetching all jobs - much faster.
      // getPrioritizedCount() must be added to waitingCount because all sync jobs
      // are added with a priority value, which places them in the prioritized sorted
      // set rather than the standard waiting list — getWaitingCount() returns 0 for them.
      // getWaitingChildrenCount() covers parent flow jobs waiting for children to finish.
      const [waitingCount, prioritizedCount, waitingChildrenCount, activeCount, completedCount, failedCount] = await Promise.all([
        queue.getWaitingCount(),
        queue.getPrioritizedCount(),
        queue.getWaitingChildrenCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
      ]);

      return {
        waiting: waitingCount + prioritizedCount + waitingChildrenCount,
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
   * Clear all jobs from all queues (obliterate)
   */
  async clearAllJobs(): Promise<void> {
    const queues = this.getAllQueues();

    await Promise.all(
      queues.map(async (queue) => {
        await queue.obliterate({ force: true });
        this.logger.log(`Obliterated queue: ${queue.name}`);
      }),
    );
  }

  /**
   * Clear only completed jobs, preserving any job tree that contains a failed child.
   * This keeps the full parent→child structure intact when debugging failures.
   */
  async clearCompletedJobs(): Promise<number> {
    const queues = this.getAllQueues();
    let removedCount = 0;

    for (const queue of queues) {
      const completedJobs = await queue.getCompleted();

      for (const job of completedJobs) {
        // Skip jobs that are part of a flow with failed children
        if (await this.hasFailedDescendantOrAncestor(job)) {
          this.logger.debug(`Keeping completed job ${job.id} (has failed relative in tree)`);
          continue;
        }

        try {
          await job.remove();
          removedCount++;
        } catch (error) {
          this.logger.warn(`Failed to remove completed job ${job.id}: ${error instanceof Error ? error.message : error}`);
        }
      }
    }

    this.logger.log(`Cleared ${removedCount} completed jobs`);
    return removedCount;
  }

  /**
   * Check if a job has any failed descendant (child/grandchild) or if any
   * ancestor's tree contains a failed job. This ensures we preserve the
   * full tree structure for debugging.
   */
  private async hasFailedDescendantOrAncestor(job: any): Promise<boolean> {
    // Check if this job itself is part of a parent flow
    const parentId = extractParentId(job);
    if (parentId) {
      // Walk up to the root and check the entire tree from there
      return this.treeHasFailedJob(job);
    }

    // This is a root job — check descendants
    return this.hasFailedDescendant(job);
  }

  private async treeHasFailedJob(job: any): Promise<boolean> {
    // If the job has a parent, we need to check siblings and the broader tree
    // The simplest approach: check if any job in the same queue family is failed
    // by walking the dependency chain
    const parentId = extractParentId(job);
    if (parentId) {
      // This job is a child — find the parent and check the full tree
      const parentQueueName = job.opts?.parent?.queue;
      if (parentQueueName) {
        const queueMap = this.getQueueMap();
        const shortName = parentQueueName.replace(/^bull:/, '');
        const parentQueue = queueMap[shortName];
        if (parentQueue) {
          const parentJob = await parentQueue.getJob(parentId);
          if (parentJob) {
            return this.treeHasFailedJob(parentJob);
          }
        }
      }
    }

    // We're at the root — check all descendants
    return this.hasFailedDescendant(job);
  }

  private async hasFailedDescendant(job: any): Promise<boolean> {
    if (job.failedReason) return true;

    let dependencies;
    try {
      dependencies = await job.getDependencies();
    } catch {
      return false;
    }

    const childJobs = [...(dependencies?.processed ? Object.values(dependencies.processed) : []), ...(dependencies?.unprocessed ?? [])];

    // getDependencies returns processed as Record<string, resultValue> and unprocessed as jobKeys
    // We need to fetch actual child jobs to check their status
    const childKeys = [];
    if (dependencies?.processed) {
      childKeys.push(...Object.keys(dependencies.processed));
    }

    // Check unprocessed children (these could be failed)
    for (const childKey of dependencies?.unprocessed ?? []) {
      // unprocessed items are job keys like "bull:queueName:jobId"
      const parts = String(childKey).split(':');
      const childJobId = parts[parts.length - 1];
      const childQueueName = parts.slice(1, -1).join(':');
      const queueMap = this.getQueueMap();
      const childQueue = queueMap[childQueueName];
      if (childQueue) {
        const childJob = await childQueue.getJob(childJobId);
        if (childJob?.failedReason) return true;
        if (childJob && (await this.hasFailedDescendant(childJob))) return true;
      }
    }

    // Check processed children — they might have failed children themselves
    for (const key of Object.keys(dependencies?.processed ?? {})) {
      const parts = String(key).split(':');
      const childJobId = parts[parts.length - 1];
      const childQueueName = parts.slice(1, -1).join(':');
      const queueMap = this.getQueueMap();
      const childQueue = queueMap[childQueueName];
      if (childQueue) {
        const childJob = await childQueue.getJob(childJobId);
        if (childJob?.failedReason) return true;
        if (childJob && (await this.hasFailedDescendant(childJob))) return true;
      }
    }

    return false;
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
