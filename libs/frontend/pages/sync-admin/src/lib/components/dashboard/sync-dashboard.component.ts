import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import dayjs from 'dayjs';

// PrimeNG Components
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { SyncButtonComponent } from '@app/frontend-components/sync';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SyncJob } from '../../models';
import { SyncDashboardService } from './sync-dashboard.service';

@Component({
  selector: 'app-sync-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ProgressSpinnerModule,
    SkeletonModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
    TranslateModule,
    DatePipe,
    SyncButtonComponent,
  ],
  providers: [MessageService, ConfirmationService, SyncDashboardService],
  templateUrl: './sync-dashboard.component.html',
  styleUrl: './sync-dashboard.component.scss',
})
export class SyncDashboardComponent implements OnDestroy {
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private syncService = inject(SyncDashboardService);
  private translateService = inject(TranslateService);

  // State from service
  queueStats = this.syncService.queueStats;
  recentJobs = this.syncService.recentJobs;
  tournaments = this.syncService.tournaments;

  // Hierarchical jobs for table display
  displayJobs = computed(() => {
    const jobs = this.recentJobs();
    return this.syncService.flattenJobsForDisplay(jobs);
  });

  loading = this.syncService.loading;
  loadingStats = this.syncService.queueStatsLoading;
  loadingJobs = this.syncService.recentJobsLoading;
  loadingTournaments = this.syncService.tournamentsLoading;

  // Manual loading state for actions
  actionLoading = signal(false);

  // Job details dialog
  jobDetailsVisible = signal(false);
  selectedJob = signal<SyncJob | null>(null);

  // Dialog visibility property for two-way binding
  get dialogVisible(): boolean {
    return this.jobDetailsVisible();
  }

  set dialogVisible(value: boolean) {
    this.jobDetailsVisible.set(value);
    if (!value) {
      this.selectedJob.set(null);
    }
  }

  // Filter state
  searchTerm = '';
  selectedType: string | null = null;
  selectedStatus: string | null = null;

  // Dropdown options with translations
  typeOptions = computed(() => [
    { label: this.translateService.instant('all.sync.dashboard.tournaments.filters.allTypes'), value: null },
    { label: this.translateService.instant('all.sync.dashboard.tournaments.types.competition'), value: 'competition' },
    { label: this.translateService.instant('all.sync.dashboard.tournaments.types.tournament'), value: 'tournament' },
  ]);

  statusOptions = computed(() => [
    { label: this.translateService.instant('all.sync.dashboard.tournaments.filters.allStatuses'), value: null },
    { label: this.translateService.instant('all.sync.dashboard.tournaments.statuses.active'), value: 'active' },
    { label: this.translateService.instant('all.sync.dashboard.tournaments.statuses.finished'), value: 'finished' },
    { label: this.translateService.instant('all.sync.dashboard.tournaments.statuses.cancelled'), value: 'cancelled' },
  ]);

  // Computed filtered tournaments
  filteredTournaments = computed(() => {
    let filtered = this.tournaments();

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(search) || t.visualCode.toLowerCase().includes(search));
    }

    if (this.selectedType) {
      filtered = filtered.filter((t) => t.type === this.selectedType);
    }

    if (this.selectedStatus) {
      filtered = filtered.filter((t) => t.status === this.selectedStatus);
    }

    return filtered;
  });

  ngOnDestroy(): void {
    // Unsubscribe from WebSocket updates when component is destroyed
    this.syncService.webSocketService.unsubscribeFromQueueStats();
    this.syncService.webSocketService.unsubscribeFromJobUpdates();
  }

  onSearchChange(): void {
    // Trigger filtering
  }

  onFilterChange(): void {
    // Trigger filtering
  }

  viewJobDetails(job: SyncJob): void {
    this.selectedJob.set(job);
    this.jobDetailsVisible.set(true);
  }

  closeJobDetails(): void {
    this.jobDetailsVisible.set(false);
    this.selectedJob.set(null);
  }

  retryJob(job: SyncJob): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('all.sync.dashboard.jobs.confirmRetry', { id: job.id }),
      header: this.translateService.instant('all.sync.dashboard.jobs.retryHeader'),
      icon: 'pi pi-refresh',
      accept: async () => {
        try {
          // TODO: Call retry API
          await new Promise((resolve) => setTimeout(resolve, 500));

          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('all.common.success'),
            detail: this.translateService.instant('all.sync.dashboard.jobs.retrySuccess', { id: job.id }),
          });

          // Refresh jobs
          this.syncService.refresh();
        } catch (error) {
          console.error('Retry error:', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translateService.instant('all.common.error'),
            detail: this.translateService.instant('all.sync.dashboard.jobs.retryError', { id: job.id }),
          });
        }
      },
    });
  }

  getJobStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'info';
      case 'waiting':
        return 'warn';
      case 'failed':
        return 'danger';
      default:
        return 'info';
    }
  }

  getTournamentStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'active':
        return 'success';
      case 'finished':
        return 'info';
      case 'cancelled':
        return 'danger';
      case 'postponed':
        return 'warn';
      default:
        return 'info';
    }
  }

  getSyncStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'success':
        return 'success';
      case 'syncing':
        return 'info';
      case 'error':
        return 'danger';
      case 'never':
        return 'warn';
      default:
        return 'info';
    }
  }

  getDuration(job: SyncJob): string {
    const finishedAt = this.getJobFinishedAt(job);
    const processedAt = this.getJobProcessedAt(job);

    if (!finishedAt && !processedAt) {
      return '-';
    }

    const startDate = this.getJobCreatedAt(job);
    if (!startDate) {
      return '-';
    }

    const endDate = finishedAt || processedAt;
    if (!endDate) {
      return '-';
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs % 60}s`;
    }
    return `${diffSecs}s`;
  }

  getJobCreatedAt(job: SyncJob): Date | undefined {
    if (job.createdAt) {
      const dayjsDate = dayjs(job.createdAt);
      return dayjsDate.isValid() ? dayjsDate.toDate() : undefined;
    }

    if (job.timestamp) {
      const dayjsFromTimestamp = dayjs(job.timestamp);
      return dayjsFromTimestamp.isValid() ? dayjsFromTimestamp.toDate() : undefined;
    }

    return undefined;
  }

  getJobProcessedAt(job: SyncJob): Date | undefined {
    if (!job.processedOn) {
      return undefined;
    }

    const dayjsDate = dayjs(job.processedOn);
    return dayjsDate.isValid() ? dayjsDate.toDate() : undefined;
  }

  getJobFinishedAt(job: SyncJob): Date | undefined {
    if (!job.finishedOn) {
      return undefined;
    }

    const dayjsDate = dayjs(job.finishedOn);
    return dayjsDate.isValid() ? dayjsDate.toDate() : undefined;
  }

  getJobType(job: SyncJob): string {
    return job.name || 'Unknown';
  }

  /**
   * Get a display name for the job that shows meaningful names instead of IDs
   */
  getJobDisplayName(job: SyncJob): string {
    try {
      // Parse job data to extract meaningful information
      let jobData: Record<string, unknown> = {};
      if (job.data) {
        if (typeof job.data === 'string') {
          jobData = JSON.parse(job.data);
        } else {
          jobData = job.data;
        }
      }

      // Helper to safely access nested properties
      const getProperty = (obj: unknown, ...keys: string[]): unknown => {
        let current: unknown = obj;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = (current as Record<string, unknown>)[key];
          } else {
            return undefined;
          }
        }
        return current;
      };

      // First check if we have metadata with a display name
      const displayName = getProperty(jobData, 'metadata', 'displayName');
      if (displayName && typeof displayName === 'string') {
        return displayName;
      }

      const jobType = this.getJobType(job);
      
      // Handle different job types and extract names
      switch (jobType.toLowerCase()) {
        case 'event':
          const eventName = getProperty(jobData, 'metadata', 'eventName') || getProperty(jobData, 'name');
          if (eventName && typeof eventName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.event')}: ${eventName}`;
          }
          break;
          
        case 'subevent':
          const subEventName = getProperty(jobData, 'metadata', 'subEventName') || getProperty(jobData, 'name');
          if (subEventName && typeof subEventName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.subEvent')}: ${subEventName}`;
          }
          break;
          
        case 'draw':
          const drawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (drawName && typeof drawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.draw')}: ${drawName}`;
          }
          break;
          
        case 'games':
          const gamesDrawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (gamesDrawName && typeof gamesDrawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.games')}: ${gamesDrawName}`;
          }
          break;
          
        case 'standing':
          const standingDrawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (standingDrawName && typeof standingDrawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.standing')}: ${standingDrawName}`;
          }
          break;
          
        case 'encounter':
        case 'competition':
          // For encounters, check metadata first for team names
          const metadataHomeTeam = getProperty(jobData, 'metadata', 'homeTeam');
          const metadataAwayTeam = getProperty(jobData, 'metadata', 'awayTeam');
          
          if (metadataHomeTeam && metadataAwayTeam) {
            const homeTeamName = (typeof metadataHomeTeam === 'object' && metadataHomeTeam !== null
              ? getProperty(metadataHomeTeam, 'name')
              : metadataHomeTeam) as string;
            const awayTeamName = (typeof metadataAwayTeam === 'object' && metadataAwayTeam !== null
              ? getProperty(metadataAwayTeam, 'name')
              : metadataAwayTeam) as string;
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.encounter')}: ${homeTeamName} vs ${awayTeamName}`;
          }
          // Fallback to legacy format
          const homeTeam = getProperty(jobData, 'homeTeam');
          const awayTeam = getProperty(jobData, 'awayTeam');
          
          if (homeTeam && awayTeam) {
            const homeTeamName = (typeof homeTeam === 'object' && homeTeam !== null
              ? getProperty(homeTeam, 'name')
              : homeTeam) as string;
            const awayTeamName = (typeof awayTeam === 'object' && awayTeam !== null
              ? getProperty(awayTeam, 'name')
              : awayTeam) as string;
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.encounter')}: ${homeTeamName} vs ${awayTeamName}`;
          }
          
          const encounterDrawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (encounterDrawName && typeof encounterDrawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.encounter')}: ${encounterDrawName}`;
          }
          break;
          
        case 'tournament':
          const tournamentName = getProperty(jobData, 'name');
          if (tournamentName && typeof tournamentName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.tournament')}: ${tournamentName}`;
          }
          break;
      }

      // Fallback: try to get a generic name from job data
      const genericName = getProperty(jobData, 'name');
      if (genericName && typeof genericName === 'string') {
        return `${jobType}: ${genericName}`;
      }

      // Final fallback: just return the translated job type
      const translationKey = `all.sync.dashboard.jobs.types.${jobType.toLowerCase()}`;
      const translatedType = this.translateService.instant(translationKey);
      
      // If translation doesn't exist, fallback to the original job type
      return translatedType !== translationKey ? translatedType : jobType;
      
    } catch (error) {
      // If parsing fails, fall back to job type
      console.warn('Failed to parse job data for display name:', error);
      return this.getJobType(job);
    }
  }

  getJobError(job: SyncJob): string | undefined {
    return job.failedReason;
  }

  getCurrentTime(): Date {
    return new Date();
  }

  /**
   * Toggle expansion of a job to show/hide its children
   */
  toggleJobExpansion(job: SyncJob): void {
    if (job.children && job.children.length > 0) {
      this.syncService.toggleJobExpansion(job.id);
    }
  }

  /**
   * Check if a job has children
   */
  hasChildren(job: SyncJob): boolean {
    return !!(job.children && job.children.length > 0);
  }

  /**
   * Get indentation style for hierarchical display
   */
  getIndentStyle(level: number): { 'padding-left': string } {
    return { 'padding-left': `${level * 20}px` };
  }

  /**
   * Get appropriate icon for expansion state
   */
  getExpansionIcon(job: SyncJob): string {
    if (!this.hasChildren(job)) {
      return '';
    }
    return job.expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right';
  }

  /**
   * Get job level for styling purposes
   */
  getJobLevel(job: SyncJob & { level?: number }): number {
    return job.level || 0;
  }
}
