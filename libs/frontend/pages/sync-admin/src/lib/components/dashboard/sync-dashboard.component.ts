import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import dayjs from 'dayjs';
import { delay, tap } from 'rxjs';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ConfirmationService, MessageService } from 'primeng/api';
import { SyncJob } from '../../models';
import { SyncApiService } from '../../services';
import { RankingSystemsOverviewComponent } from '../ranking-systems/ranking-systems-overview.component';
import { SyncDashboardService } from './sync-dashboard.service';

@Component({
  selector: 'app-sync-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    ProgressSpinnerModule,
    SkeletonModule,
    SelectModule,
    DatePickerModule,
    ToastModule,
    TooltipModule,
    ConfirmDialogModule,
    DialogModule,
    TranslateModule,
    DatePipe,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    RankingSystemsOverviewComponent,
  ],
  providers: [MessageService, ConfirmationService, SyncDashboardService],
  templateUrl: './sync-dashboard.component.html',
  styleUrl: './sync-dashboard.component.scss',
})
export class SyncDashboardComponent implements OnDestroy {
  private readonly queueMutationDelayMs = 600;

  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private syncService = inject(SyncDashboardService);
  private syncApiService = inject(SyncApiService);
  private translateService = inject(TranslateService);

  // Queue stats
  queueStats = this.syncService.queueStats;
  loadingStats = this.syncService.queueStatsLoading;

  // Jobs
  recentJobs = this.syncService.recentJobs;
  loadingJobs = this.syncService.recentJobsLoading;
  jobSearchQuery = signal('');

  displayJobs = computed(() => {
    const jobs = this.recentJobs();
    const flat = this.syncService.flattenJobsForDisplay(jobs);
    const query = this.jobSearchQuery().trim().toLowerCase();
    if (!query) return flat;
    return flat.filter(
      (job) =>
        job.id?.toString().toLowerCase().includes(query) ||
        this.getJobDisplayName(job).toLowerCase().includes(query) ||
        job.status?.toLowerCase().includes(query),
    );
  });

  // Scheduling
  filter = this.syncService.filter;
  displayItems = this.syncService.displayItems;
  eventsLoading = this.syncService.eventsLoading;
  selectedCount = this.syncService.selectedCount;

  actionLoading = signal(false);

  // Job details dialog
  jobDetailsVisible = signal(false);
  selectedJob = signal<SyncJob | null>(null);

  // Ranking sync dialog
  rankingSyncDialogState = signal(false);
  rankingSyncStartDate = signal<Date | null>(null);

  get dialogVisible(): boolean {
    return this.jobDetailsVisible();
  }

  set dialogVisible(value: boolean) {
    this.jobDetailsVisible.set(value);
    if (!value) {
      this.selectedJob.set(null);
    }
  }

  get rankingDialogVisible(): boolean {
    return this.rankingSyncDialogState();
  }

  set rankingDialogVisible(value: boolean) {
    this.rankingSyncDialogState.set(value);
    if (!value) {
      this.rankingSyncStartDate.set(null);
    }
  }

  get rankingStartDateValue(): Date | null {
    return this.rankingSyncStartDate();
  }

  set rankingStartDateValue(value: Date | null) {
    this.rankingSyncStartDate.set(value);
  }

  // Dropdown options
  eventCategoryOptions = computed(() => [
    { label: this.translateService.instant('all.sync.dashboard.scheduling.competition'), value: 'competition' },
    { label: this.translateService.instant('all.sync.dashboard.scheduling.tournament'), value: 'tournament' },
  ]);

  syncLevelOptions = computed(() => {
    const category = this.filter.controls.eventCategory.value;
    const options = [
      { label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.event'), value: 'event' },
      { label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.subEvent'), value: 'subEvent' },
      { label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.draw'), value: 'draw' },
    ];

    if (category === 'competition') {
      options.push({
        label: this.translateService.instant('all.sync.dashboard.scheduling.syncLevel.encounter'),
        value: 'encounter',
      });
    }

    return options;
  });

  ngOnDestroy(): void {
    this.syncService.webSocketService.unsubscribeFromQueueStats();
    this.syncService.webSocketService.unsubscribeFromJobUpdates();
  }

  // ===== SCHEDULING =====

  isSelected(id: string): boolean {
    return this.syncService.isSelected(id);
  }

  isAllSelected(): boolean {
    return this.syncService.isAllSelected();
  }

  toggleSelection(id: string): void {
    this.syncService.toggleSelection(id);
  }

  toggleSelectAll(): void {
    if (this.syncService.isAllSelected()) {
      this.syncService.deselectAll();
    } else {
      this.syncService.selectAll();
    }
  }

  toggleExpansion(id: string): void {
    this.syncService.toggleHierarchyExpansion(id);
  }

  getIndentStyle(level: number): { 'padding-left': string } {
    return { 'padding-left': `${level * 24}px` };
  }

  scheduleSyncForSelected(): void {
    const count = this.syncService.selectedCount();
    const syncLevel = this.filter.controls.syncLevel.value;

    this.confirmationService.confirm({
      message: this.translateService.instant('all.sync.dashboard.scheduling.confirmSync', { count, level: syncLevel }),
      header: this.translateService.instant('all.sync.dashboard.scheduling.scheduleSync'),
      icon: 'pi pi-sync',
      accept: () => {
        this.actionLoading.set(true);
        const sync$ = this.syncService.getScheduleSyncObservable();
        if (!sync$) return;

        sync$.subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('all.common.success'),
              detail: this.translateService.instant('all.sync.dashboard.scheduling.syncScheduled', { count }),
            });
            this.syncService.deselectAll();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('all.common.error'),
              detail: this.translateService.instant('all.sync.dashboard.scheduling.syncError'),
            });
          },
          complete: () => this.actionLoading.set(false),
        });
      },
    });
  }

  // ===== DISCOVERY =====

  triggerDiscoverySync(): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('all.sync.dashboard.actions.confirmDiscovery'),
      header: this.translateService.instant('all.sync.dashboard.actions.sync'),
      icon: 'pi pi-search',
      accept: () => {
        this.actionLoading.set(true);
        this.syncApiService.triggerDiscoverySync().subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('all.common.success'),
              detail: this.translateService.instant('all.sync.dashboard.actions.syncQueued'),
            });
            this.syncService.refresh();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('all.common.error'),
              detail: this.translateService.instant('all.sync.dashboard.actions.syncError'),
            });
          },
          complete: () => this.actionLoading.set(false),
        });
      },
    });
  }

  clearAllJobs(): void {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'all.sync.dashboard.actions.confirmClearAll',
      ),
      header: this.translateService.instant(
        'all.sync.dashboard.actions.clearAll',
      ),
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.actionLoading.set(true);
        this.syncApiService.clearAllJobs().pipe(
          delay(this.queueMutationDelayMs),
        ).subscribe({
          next: (result) => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('all.common.success'),
              detail:
                result.message ||
                this.translateService.instant(
                  'all.sync.dashboard.actions.clearAllSuccess',
                ),
            });
            this.syncService.refresh()
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('all.common.error'),
              detail: this.translateService.instant(
                'all.sync.dashboard.actions.clearAllError',
              ),
            });
          },
          complete: () => this.actionLoading.set(false),
        });
      },
    });
  }

  clearCompletedJobs(): void {
    this.confirmationService.confirm({
      message: this.translateService.instant(
        'all.sync.dashboard.actions.confirmClearCompleted',
      ),
      header: this.translateService.instant(
        'all.sync.dashboard.actions.clearCompleted',
      ),
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.actionLoading.set(true);
        this.syncApiService.clearCompletedJobs().pipe(delay(this.queueMutationDelayMs)).subscribe({
          next: (result) => {
            this.messageService.add({
              severity: 'success',
              summary: this.translateService.instant('all.common.success'),
              detail:
                result.message ||
                this.translateService.instant(
                  'all.sync.dashboard.actions.clearCompletedSuccess',
                ),
            });
            this.syncService.refresh();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: this.translateService.instant('all.common.error'),
              detail: this.translateService.instant(
                'all.sync.dashboard.actions.clearCompletedError',
              ),
            });
          },
          complete: () => this.actionLoading.set(false),
        });
      },
    });
  }

  openRankingSyncDialog(): void {
    this.rankingSyncDialogState.set(true);
  }

  scheduleRankingSync(): void {
    this.actionLoading.set(true);

    const startDate = this.rankingSyncStartDate();
    const formattedStartDate = startDate
      ? dayjs(startDate).format('YYYY-MM-DD')
      : undefined;

    this.syncApiService.triggerRankingSync(formattedStartDate)
    .pipe(delay(this.queueMutationDelayMs))
    .subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: this.translateService.instant('all.common.success'),
          detail: formattedStartDate
            ? this.translateService.instant(
                'all.sync.dashboard.actions.rankingSyncQueuedFrom',
                { date: formattedStartDate },
              )
            : this.translateService.instant(
                'all.sync.dashboard.actions.rankingSyncQueued',
              ),
        });
          this.syncService.refresh();
        this.rankingDialogVisible = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: this.translateService.instant('all.common.error'),
          detail: this.translateService.instant(
            'all.sync.dashboard.actions.rankingSyncError',
          ),
        });
      },
      complete: () => this.actionLoading.set(false),
    });
  }

  // ===== JOB DISPLAY =====

  viewJobDetails(job: SyncJob): void {
    this.selectedJob.set(job);
    this.jobDetailsVisible.set(true);
  }

  retryJob(job: SyncJob): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('all.sync.dashboard.jobs.confirmRetry', { id: job.id }),
      header: this.translateService.instant('all.sync.dashboard.jobs.retryHeader'),
      icon: 'pi pi-refresh',
      accept: async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          this.messageService.add({
            severity: 'success',
            summary: this.translateService.instant('all.common.success'),
            detail: this.translateService.instant('all.sync.dashboard.jobs.retrySuccess', { id: job.id }),
          });
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

  getJobDisplayName(job: SyncJob): string {
    try {
      let jobData: Record<string, unknown> = {};
      if (job.data) {
        if (typeof job.data === 'string') {
          jobData = JSON.parse(job.data);
        } else {
          jobData = job.data;
        }
      }

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

      const displayName = getProperty(jobData, 'metadata', 'displayName');
      if (displayName && typeof displayName === 'string') {
        return displayName;
      }

      const jobType = job.name || 'Unknown';

      switch (jobType.toLowerCase()) {
        case 'event': {
          const eventName = getProperty(jobData, 'metadata', 'eventName') || getProperty(jobData, 'name');
          if (eventName && typeof eventName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.event')}: ${eventName}`;
          }
          break;
        }
        case 'subevent': {
          const subEventName = getProperty(jobData, 'metadata', 'subEventName') || getProperty(jobData, 'name');
          if (subEventName && typeof subEventName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.subEvent')}: ${subEventName}`;
          }
          break;
        }
        case 'draw': {
          const drawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (drawName && typeof drawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.draw')}: ${drawName}`;
          }
          break;
        }
        case 'games': {
          const gamesDrawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (gamesDrawName && typeof gamesDrawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.games')}: ${gamesDrawName}`;
          }
          break;
        }
        case 'standing': {
          const standingDrawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (standingDrawName && typeof standingDrawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.standing')}: ${standingDrawName}`;
          }
          break;
        }
        case 'encounter':
        case 'competition': {
          const metadataHomeTeam = getProperty(jobData, 'metadata', 'homeTeam');
          const metadataAwayTeam = getProperty(jobData, 'metadata', 'awayTeam');

          if (metadataHomeTeam && metadataAwayTeam) {
            const homeTeamName = (
              typeof metadataHomeTeam === 'object' && metadataHomeTeam !== null ? getProperty(metadataHomeTeam, 'name') : metadataHomeTeam
            ) as string;
            const awayTeamName = (
              typeof metadataAwayTeam === 'object' && metadataAwayTeam !== null ? getProperty(metadataAwayTeam, 'name') : metadataAwayTeam
            ) as string;
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.encounter')}: ${homeTeamName} vs ${awayTeamName}`;
          }
          const homeTeam = getProperty(jobData, 'homeTeam');
          const awayTeam = getProperty(jobData, 'awayTeam');

          if (homeTeam && awayTeam) {
            const homeTeamName = (typeof homeTeam === 'object' && homeTeam !== null ? getProperty(homeTeam, 'name') : homeTeam) as string;
            const awayTeamName = (typeof awayTeam === 'object' && awayTeam !== null ? getProperty(awayTeam, 'name') : awayTeam) as string;
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.encounter')}: ${homeTeamName} vs ${awayTeamName}`;
          }

          const encounterDrawName = getProperty(jobData, 'metadata', 'drawName') || getProperty(jobData, 'name');
          if (encounterDrawName && typeof encounterDrawName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.encounter')}: ${encounterDrawName}`;
          }
          break;
        }
        case 'tournament': {
          const tournamentName = getProperty(jobData, 'name');
          if (tournamentName && typeof tournamentName === 'string') {
            return `${this.translateService.instant('all.sync.dashboard.jobs.types.tournament')}: ${tournamentName}`;
          }
          break;
        }
      }

      const genericName = getProperty(jobData, 'name');
      if (genericName && typeof genericName === 'string') {
        return `${jobType}: ${genericName}`;
      }

      const translationKey = `all.sync.dashboard.jobs.types.${jobType.toLowerCase()}`;
      const translatedType = this.translateService.instant(translationKey);
      return translatedType !== translationKey ? translatedType : jobType;
    } catch (error) {
      console.warn('Failed to parse job data for display name:', error);
      return job.name || 'Unknown';
    }
  }

  getJobError(job: SyncJob): string | undefined {
    return job.failedReason;
  }

  toggleJobExpansion(job: SyncJob): void {
    if (job.children && job.children.length > 0) {
      this.syncService.toggleJobExpansion(job.id);
    }
  }

  hasChildren(job: SyncJob): boolean {
    return !!(job.children && job.children.length > 0);
  }

  getJobIndentStyle(level: number): { 'padding-left': string } {
    return { 'padding-left': `${level * 20}px` };
  }

  getExpansionIcon(job: SyncJob): string {
    if (!this.hasChildren(job)) {
      return '';
    }
    return job.expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right';
  }

  getJobLevel(job: SyncJob & { level?: number }): number {
    return job.level || 0;
  }
}
