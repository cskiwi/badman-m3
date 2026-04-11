import { InjectQueue, OnQueueEvent, QueueEventsHost, QueueEventsListener } from '@nestjs/bullmq';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { SyncGateway } from '../gateways/sync.gateway';
import { SyncService } from '../services/sync.service';
import { extractParentId } from '../utils/job.utils';
import { SYNC_QUEUE, TOURNAMENT_DISCOVERY_QUEUE, COMPETITION_EVENT_QUEUE, TOURNAMENT_EVENT_QUEUE, TEAM_MATCHING_QUEUE } from '../queues/sync.queue';

// Base listener class with shared functionality
abstract class BaseQueueEventsListener extends QueueEventsHost {
  constructor(
    protected readonly syncGateway: SyncGateway,
    protected readonly queue: Queue,
    protected readonly syncService: SyncService,
  ) {
    super();
  }

  @OnQueueEvent('waiting')
  onWaiting(job: { jobId: string; prev?: string }) {
    this.emitJobUpdateById(job.jobId);
    this.emitQueueStatsUpdate();
  }

  // Fired by BullMQ when a job is added with a priority value (goes into the
  // prioritized sorted set instead of the standard waiting list).
  @OnQueueEvent('prioritized' as any)
  onPrioritized(job: { jobId: string; priority: number }) {
    this.emitJobUpdateById(job.jobId);
    this.emitQueueStatsUpdate();
  }

  @OnQueueEvent('active')
  onActive(job: { jobId: string; prev?: string }) {
    this.emitJobUpdateById(job.jobId);
    this.emitQueueStatsUpdate();
  }

  @OnQueueEvent('completed')
  onCompleted(job: { jobId: string; returnvalue: unknown; prev?: string }) {
    this.emitJobUpdateById(job.jobId);
    this.emitQueueStatsUpdate();
    this.emitJobCompletedById(job.jobId);
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string; failedReason: string; prev?: string }) {
    this.emitJobUpdateById(job.jobId);
    this.emitQueueStatsUpdate();
    this.emitJobFailedById(job.jobId);
  }

  @OnQueueEvent('progress')
  onProgress(job: { jobId: string; data: unknown }) {
    this.emitJobUpdateById(job.jobId);
  }

  @OnQueueEvent('removed')
  onRemoved() {
    this.emitQueueStatsUpdate();
  }

  protected async emitJobUpdateById(jobId: string) {
    if (this.syncGateway) {
      const job = await this.queue.getJob(jobId);
      if (job) {
        this.syncGateway.emitJobUpdate(this.formatJobForWebSocket(job));
      }
    }
  }

  protected async emitJobCompletedById(jobId: string) {
    if (this.syncGateway) {
      const job = await this.queue.getJob(jobId);
      if (job) {
        this.syncGateway.emitJobCompleted(this.formatJobForWebSocket(job));
      }
    }
  }

  protected async emitJobFailedById(jobId: string) {
    if (this.syncGateway) {
      const job = await this.queue.getJob(jobId);
      if (job) {
        this.syncGateway.emitJobFailed(this.formatJobForWebSocket(job));
      }
    }
  }

  protected async emitQueueStatsUpdate() {
    if (this.syncGateway) {
      // Use SyncService to get aggregate stats across ALL queues
      const stats = await this.syncService.getQueueStats();
      this.syncGateway.emitQueueStatsUpdate(stats);
    }
  }

  protected formatJobForWebSocket(job: Job) {
    return {
      id: job.id?.toString() || '',
      name: job.name || '',
      data: JSON.stringify(job.data || {}),
      progress: typeof job.progress === 'function' ? job.progress() : job.progress || 0,
      processedOn: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedOn: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason || undefined,
      status: this.getJobStatus(job),
      timestamp: job.timestamp || Date.now(),
      createdAt: job.timestamp ? new Date(job.timestamp) : new Date(),
      parentId: extractParentId(job),
    };
  }

  protected getJobStatus(job: Job): 'waiting' | 'active' | 'completed' | 'failed' {
    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    return 'waiting';
  }
}

// Individual listeners for each queue
@QueueEventsListener(SYNC_QUEUE)
@Injectable()
export class SyncEventsListener extends BaseQueueEventsListener {
  constructor(
    @Inject(forwardRef(() => SyncGateway))
    syncGateway: SyncGateway,
    @InjectQueue(SYNC_QUEUE)
    queue: Queue,
    syncService: SyncService,
  ) {
    super(syncGateway, queue, syncService);
  }
}

@QueueEventsListener(TOURNAMENT_DISCOVERY_QUEUE)
@Injectable()
export class TournamentDiscoveryEventsListener extends BaseQueueEventsListener {
  constructor(
    @Inject(forwardRef(() => SyncGateway))
    syncGateway: SyncGateway,
    @InjectQueue(TOURNAMENT_DISCOVERY_QUEUE)
    queue: Queue,
    syncService: SyncService,
  ) {
    super(syncGateway, queue, syncService);
  }
}

@QueueEventsListener(COMPETITION_EVENT_QUEUE)
@Injectable()
export class CompetitionEventEventsListener extends BaseQueueEventsListener {
  constructor(
    @Inject(forwardRef(() => SyncGateway))
    syncGateway: SyncGateway,
    @InjectQueue(COMPETITION_EVENT_QUEUE)
    queue: Queue,
    syncService: SyncService,
  ) {
    super(syncGateway, queue, syncService);
  }
}

@QueueEventsListener(TOURNAMENT_EVENT_QUEUE)
@Injectable()
export class TournamentEventEventsListener extends BaseQueueEventsListener {
  constructor(
    @Inject(forwardRef(() => SyncGateway))
    syncGateway: SyncGateway,
    @InjectQueue(TOURNAMENT_EVENT_QUEUE)
    queue: Queue,
    syncService: SyncService,
  ) {
    super(syncGateway, queue, syncService);
  }
}

@QueueEventsListener(TEAM_MATCHING_QUEUE)
@Injectable()
export class TeamMatchingEventsListener extends BaseQueueEventsListener {
  constructor(
    @Inject(forwardRef(() => SyncGateway))
    syncGateway: SyncGateway,
    @InjectQueue(TEAM_MATCHING_QUEUE)
    queue: Queue,
    syncService: SyncService,
  ) {
    super(syncGateway, queue, syncService);
  }
}
