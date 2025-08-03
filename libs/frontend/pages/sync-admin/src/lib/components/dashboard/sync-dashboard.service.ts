import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { AuthService } from '@app/frontend-modules-auth/service';
import { lastValueFrom } from 'rxjs';
import { Tournament } from '../../models/sync-dashboard.models';
import { SyncJob } from '../../models/sync.models';
import { SyncApiService } from '../../services';
import { WebSocketSyncService } from '../../services/websocket-sync.service';

export class SyncDashboardService {
  private readonly auth = inject(AuthService);
  readonly webSocketService = inject(WebSocketSyncService);
  private readonly syncService = inject(SyncApiService);

  // Internal flat job list for centralized management
  private _flatJobsList = signal<SyncJob[]>([]);
  private _expansionStates = signal<Map<string, boolean>>(new Map());

  // Computed hierarchical jobs that automatically rebuild when flat list changes
  private _hierarchicalJobs = computed(() => {
    const flatJobs = this._flatJobsList();
    if (flatJobs.length === 0) {
      return [];
    }

    // Build hierarchy from flat list
    const hierarchicalJobs = this.buildJobHierarchy([...flatJobs]);

    // Restore expansion states
    this.restoreExpansionStates(hierarchicalJobs, this._expansionStates());

    // Limit to 20 root jobs for display
    return hierarchicalJobs.slice(0, 20);
  });

  // Filter form for reactive updates
  filter = new FormGroup({
    jobsLimit: new FormControl<number>(10000),
    jobsStatus: new FormControl<string | null>(null),
    refreshInterval: new FormControl<number>(30000), // 30 seconds default (not used with WebSocket)
  });

  // Convert form to signal for reactive updates
  private filterSignal = toSignal(this.filter.valueChanges);

  // Manual refresh trigger for fallback GraphQL queries
  private refreshTrigger = signal(0);

  constructor() {
    // Load initial data via GraphQL, then rely on WebSocket for updates
    this.loadInitialData();

    // Set up WebSocket job handling delegation
    this.webSocketService.setJobUpdateHandler((job: SyncJob) => this.handleJobUpdate(job));
  }

  /**
   * Load initial data via GraphQL, then WebSocket takes over for real-time updates
   */
  private async loadInitialData(): Promise<void> {
    try {
      if (!this.auth.loggedIn()) {
        return;
      }

      // Set loading states
      this.webSocketService.setQueueStatsLoading(true);
      this.webSocketService.setRecentJobsLoading(true);

      // Load queue stats
      const syncStatusResult = await lastValueFrom(this.syncService.getStatus());

      if (syncStatusResult) {
        this.webSocketService.setInitialSyncStatus(syncStatusResult);
        this.webSocketService.setInitialQueueStats(syncStatusResult.queues);
      }

      // Load recent jobs
      const filterValues = this.filterSignal();
      const syncJobsResult = await lastValueFrom(
        this.syncService.getRecentJobs(filterValues?.jobsLimit || 10000, filterValues?.jobsStatus || undefined),
      );

      if (syncJobsResult) {
        // Set initial jobs using centralized management
        this.setInitialJobs(syncJobsResult);
      }
    } catch (err) {
      console.warn('Failed to load initial sync data:', err);
    } finally {
      this.webSocketService.setQueueStatsLoading(false);
      this.webSocketService.setRecentJobsLoading(false);
    }
  }

  // Tournaments Resource (mock data for now)
  private tournamentsResource = resource({
    params: computed(() => ({ refresh: this.refreshTrigger() })),
    loader: async () => {
      try {
        const tournaments: Tournament[] = [];
        return tournaments;
      } catch (err) {
        console.warn('Failed to load tournaments:', err);
        // Return empty array instead of throwing to prevent SSR crashes
        return [];
      }
    },
  });

  // Public computed selectors - now delegated to WebSocket service
  syncStatus = this.webSocketService.syncStatus;
  queueStats = this.webSocketService.queueStats;
  queueStatsLoading = this.webSocketService.queueStatsLoading;
  queueStatsError = computed(() => null); // WebSocket errors handled internally

  recentJobs = computed(() => this._hierarchicalJobs());
  recentJobsLoading = this.webSocketService.recentJobsLoading;
  recentJobsError = computed(() => null); // WebSocket errors handled internally

  tournaments = computed(() => this.tournamentsResource.value() ?? []);
  tournamentsLoading = this.webSocketService.tournamentsLoading;
  tournamentsError = computed(() => this.tournamentsResource.error()?.message || null);

  // Combined loading state
  loading = this.webSocketService.loading;

  // Manual refresh method - now reloads initial data instead of triggering resource refresh
  refresh(): void {
    this.loadInitialData();
  }

  // Update filter settings
  updateJobsLimit(limit: number): void {
    this.filter.patchValue({ jobsLimit: limit });
  }

  updateJobsStatus(status: string | null): void {
    this.filter.patchValue({ jobsStatus: status });
  }

  updateRefreshInterval(interval: number): void {
    this.filter.patchValue({ refreshInterval: interval });
  }

  private handleError(err: HttpErrorResponse): string {
    // Handle specific error cases
    if (err.status === 403) {
      return 'Insufficient permissions to access sync data';
    }
    if (err.status === 404) {
      return 'Sync service not available';
    }
    if (err.status === 500) {
      return 'Sync service error occurred';
    }

    // Generic error if no cases match
    return err.statusText || 'An error occurred while loading sync data';
  }

  /**
   * Build hierarchical structure from flat job array based on parent-child relationships
   */
  private buildJobHierarchy(jobs: SyncJob[]): SyncJob[] {
    const jobMap = new Map<string, SyncJob>();
    const rootJobs: SyncJob[] = [];

    // First pass: clone jobs and initialize children arrays
    const clonedJobs = jobs.map((job) => ({
      ...job,
      children: [],
      expanded: false,
    }));
    clonedJobs.forEach((job) => {
      jobMap.set(job.id, job);
    });

    // Second pass: build hierarchy
    clonedJobs.forEach((job) => {
      if (job.parentId && jobMap.has(job.parentId)) {
        const parent = jobMap.get(job.parentId);
        if (parent && Array.isArray(parent.children)) {
          parent.children.push(job);
        }
      } else {
        // Root level job (no parent or parent not found)
        rootJobs.push(job);
      }
    });

    // Sort children within each parent by timestamp (newest first)
    this.sortJobsRecursively(rootJobs);

    return rootJobs;
  }

  /**
   * Recursively sort jobs and their children by timestamp (newest first)
   */
  private sortJobsRecursively(jobs: SyncJob[]): void {
    jobs.sort((a, b) => {
      const timeA = a.timestamp || a.createdAt?.getTime() || 0;
      const timeB = b.timestamp || b.createdAt?.getTime() || 0;
      return timeB - timeA; // Newest first
    });

    jobs.forEach((job) => {
      if (job.children && job.children.length > 0) {
        this.sortJobsRecursively(job.children);
      }
    });
  }

  // ===== CENTRALIZED JOB MANAGEMENT =====

  /**
   * Set initial jobs from GraphQL query
   */
  private setInitialJobs(jobs: SyncJob[]): void {
    // Preserve expansion states from existing jobs
    const currentHierarchy = this._hierarchicalJobs();
    const expansionState = new Map<string, boolean>();
    this.collectExpansionStates(currentHierarchy, expansionState);
    this._expansionStates.set(expansionState);

    // Store flat list - computed will automatically rebuild hierarchy
    this._flatJobsList.set([...jobs]);
  }

  /**
   * Handle job updates from WebSocket
   */
  private handleJobUpdate(updatedJob: SyncJob): void {
    // Initialize hierarchy properties if not set
    if (!updatedJob.children) updatedJob.children = [];
    if (updatedJob.expanded === undefined) updatedJob.expanded = false;

    // Update flat list - computed will automatically rebuild hierarchy
    const currentFlatJobs = this._flatJobsList();
    const existingIndex = currentFlatJobs.findIndex((job) => job.id === updatedJob.id);

    let updatedFlatJobs: SyncJob[];
    if (existingIndex >= 0) {
      // Replace existing job
      updatedFlatJobs = [...currentFlatJobs];
      updatedFlatJobs[existingIndex] = updatedJob;
    } else {
      // Add new job - insert at appropriate position to maintain hierarchy order
      updatedFlatJobs = this.insertJobInProperPosition(updatedJob, currentFlatJobs);
    }

    this._flatJobsList.set(updatedFlatJobs);
  }

  /**
   * Insert a job in the proper position within the flat list to help maintain hierarchy
   */
  private insertJobInProperPosition(newJob: SyncJob, currentJobs: SyncJob[]): SyncJob[] {
    // If the job has a parent, try to place it near the parent
    if (newJob.parentId) {
      const parentIndex = currentJobs.findIndex((job) => job.id === newJob.parentId);
      if (parentIndex >= 0) {
        // Insert after the parent job
        const updatedJobs = [...currentJobs];
        updatedJobs.splice(parentIndex + 1, 0, newJob);
        return updatedJobs;
      }

      // If parent not found, look for siblings (jobs with same parentId)
      const siblingIndex = currentJobs.findIndex((job) => job.parentId === newJob.parentId);
      if (siblingIndex >= 0) {
        // Insert near the sibling
        const updatedJobs = [...currentJobs];
        updatedJobs.splice(siblingIndex, 0, newJob);
        return updatedJobs;
      }
    }

    // If no parent relationship found, add at the beginning (most recent)
    return [newJob, ...currentJobs];
  }

  /**
   * Collect expansion states from current hierarchy
   */
  private collectExpansionStates(jobs: SyncJob[], stateMap: Map<string, boolean>): void {
    jobs.forEach((job) => {
      if (job.expanded !== undefined) {
        stateMap.set(job.id, job.expanded);
      }
      if (job.children && job.children.length > 0) {
        this.collectExpansionStates(job.children, stateMap);
      }
    });
  }

  /**
   * Restore expansion states to rebuilt hierarchy
   */
  private restoreExpansionStates(jobs: SyncJob[], stateMap: Map<string, boolean>): void {
    jobs.forEach((job) => {
      const savedState = stateMap.get(job.id);
      if (savedState !== undefined) {
        job.expanded = savedState;
      }
      if (job.children && job.children.length > 0) {
        this.restoreExpansionStates(job.children, stateMap);
      }
    });
  }

  /**
   * Toggle expansion state of a job
   */
  toggleJobExpansion(jobId: string): void {
    const currentStates = this._expansionStates();
    const newStates = new Map(currentStates);
    const currentState = newStates.get(jobId) || false;
    newStates.set(jobId, !currentState);
    this._expansionStates.set(newStates);
  }

  /**
   * Find a job by ID in the hierarchical structure
   */
  private findJobInHierarchy(jobId: string, jobs: SyncJob[]): SyncJob | null {
    for (const job of jobs) {
      if (job.id === jobId) {
        return job;
      }
      if (job.children) {
        const found = this.findJobInHierarchy(jobId, job.children);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Flatten hierarchical jobs for table display while preserving structure
   */
  flattenJobsForDisplay(jobs: SyncJob[], level = 0): Array<SyncJob & { level: number }> {
    const flattened: Array<SyncJob & { level: number }> = [];

    jobs.forEach((job) => {
      // Add the job itself with its level
      flattened.push({ ...job, level });

      // If job is expanded and has children, add them recursively
      if (job.expanded && job.children && job.children.length > 0) {
        const childrenFlattened = this.flattenJobsForDisplay(job.children, level + 1);
        flattened.push(...childrenFlattened);
      }
    });

    return flattened;
  }
}
