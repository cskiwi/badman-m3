import { computed, effect, inject, signal } from '@angular/core';
import { AuthService } from '@app/frontend-modules-auth/service';
import { SyncJob } from '../../models/sync.models';
import { SyncApiService } from '../../services';
import { WebSocketSyncService } from '../../services/websocket-sync.service';

export class OverviewTabService {
  private readonly auth = inject(AuthService);
  private readonly syncApiService = inject(SyncApiService);
  readonly webSocketService = inject(WebSocketSyncService);

  private _flatJobsList = signal<SyncJob[]>([]);
  private _expansionStates = signal<Map<string, boolean>>(new Map());

  private _hierarchicalJobs = computed(() => {
    const flatJobs = this._flatJobsList();
    const expansionStates = this._expansionStates();
    if (flatJobs.length === 0) return [];
    return this.buildJobHierarchy([...flatJobs], expansionStates);
  });

  queueStats = this.webSocketService.queueStats;
  queueStatsLoading = this.webSocketService.queueStatsLoading;
  recentJobs = computed(() => this._hierarchicalJobs());
  recentJobsLoading = this.webSocketService.recentJobsLoading;

  constructor() {
    this.loadInitialData();
    this.webSocketService.setJobUpdateHandler((job: SyncJob) => this.handleJobUpdate(job));

    // Re-subscribe to WebSocket events when connection is established
    effect(() => {
      if (this.webSocketService.isConnected()) {
        this.webSocketService.subscribeToQueueStats();
        this.webSocketService.subscribeToJobUpdates();
      }
    });
  }

  refresh(): void {
    this.loadInitialData();
  }

  toggleJobExpansion(jobId: string): void {
    const currentStates = this._expansionStates();
    const newStates = new Map(currentStates);
    newStates.set(jobId, !(newStates.get(jobId) ?? false));
    this._expansionStates.set(newStates);
  }

  flattenJobsForDisplay(jobs: SyncJob[], level = 0): Array<SyncJob & { level: number }> {
    const flattened: Array<SyncJob & { level: number }> = [];
    jobs.forEach((job) => {
      flattened.push({ ...job, level });
      if (job.expanded && job.children && job.children.length > 0) {
        flattened.push(...this.flattenJobsForDisplay(job.children, level + 1));
      }
    });
    return flattened;
  }

  private loadInitialData(): void {
    this.webSocketService.setRecentJobsLoading(true);
    this.syncApiService.getRecentJobs().subscribe({
      next: (jobs) => {
        this._flatJobsList.set(jobs);
        this.webSocketService.setRecentJobsLoading(false);
      },
      error: () => {
        this.webSocketService.setRecentJobsLoading(false);
      },
    });
  }

  private handleJobUpdate(job: SyncJob): void {
    const currentJobs = [...this._flatJobsList()];
    const existingIndex = currentJobs.findIndex((j) => j.id === job.id);
    if (existingIndex >= 0) {
      currentJobs[existingIndex] = { ...currentJobs[existingIndex], ...job };
    } else {
      currentJobs.unshift(job);
    }
    this._flatJobsList.set(currentJobs);
  }

  private buildJobHierarchy(jobs: SyncJob[], expansionStates: Map<string, boolean>): SyncJob[] {
    const jobMap = new Map<string, SyncJob>();
    const rootJobs: SyncJob[] = [];

    for (const job of jobs) {
      jobMap.set(job.id, { ...job, children: [], expanded: expansionStates.get(job.id) ?? false });
    }

    for (const job of jobs) {
      const enrichedJob = jobMap.get(job.id)!;
      if (job.parentId && jobMap.has(job.parentId)) {
        jobMap.get(job.parentId)!.children!.push(enrichedJob);
      } else {
        rootJobs.push(enrichedJob);
      }
    }

    return rootJobs;
  }
}
