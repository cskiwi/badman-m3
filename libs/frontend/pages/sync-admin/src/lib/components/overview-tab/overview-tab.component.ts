import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import dayjs from 'dayjs';
import { delay } from 'rxjs';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { ConfirmationService, MessageService } from 'primeng/api';
import { SyncJob } from '../../models';
import { SyncApiService } from '../../services';
import { OverviewTabService } from './overview-tab.service';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    SkeletonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    TranslateModule,
    DatePipe,
  ],
  providers: [MessageService, ConfirmationService, OverviewTabService],
  templateUrl: './overview-tab.component.html',
})
export class OverviewTabComponent implements OnDestroy {
  private readonly queueMutationDelayMs = 600;
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private overviewService = inject(OverviewTabService);
  private syncApiService = inject(SyncApiService);
  private translateService = inject(TranslateService);

  queueStats = this.overviewService.queueStats;
  loadingStats = this.overviewService.queueStatsLoading;

  recentJobs = this.overviewService.recentJobs;
  loadingJobs = this.overviewService.recentJobsLoading;
  jobSearchQuery = signal('');

  displayJobs = computed(() => {
    const jobs = this.recentJobs();
    const flat = this.overviewService.flattenJobsForDisplay(jobs);
    const query = this.jobSearchQuery().trim().toLowerCase();
    if (!query) return flat;
    return flat.filter(
      (job) =>
        job.id?.toString().toLowerCase().includes(query) ||
        this.getJobDisplayName(job).toLowerCase().includes(query) ||
        job.status?.toLowerCase().includes(query),
    );
  });

  actionLoading = signal(false);

  jobDetailsVisible = signal(false);
  selectedJob = signal<SyncJob | null>(null);

  get dialogVisible(): boolean {
    return this.jobDetailsVisible();
  }

  set dialogVisible(value: boolean) {
    this.jobDetailsVisible.set(value);
    if (!value) {
      this.selectedJob.set(null);
    }
  }

  ngOnDestroy(): void {
    this.overviewService.webSocketService.unsubscribeFromQueueStats();
    this.overviewService.webSocketService.unsubscribeFromJobUpdates();
  }

  clearAllJobs(): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('all.sync.dashboard.actions.confirmClearAll'),
      header: this.translateService.instant('all.sync.dashboard.actions.clearAll'),
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.actionLoading.set(true);
        this.syncApiService
          .clearAllJobs()
          .pipe(delay(this.queueMutationDelayMs))
          .subscribe({
            next: (result) => {
              this.messageService.add({
                severity: 'success',
                summary: this.translateService.instant('all.common.success'),
                detail: result.message || this.translateService.instant('all.sync.dashboard.actions.clearAllSuccess'),
              });
              this.overviewService.refresh();
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: this.translateService.instant('all.common.error'),
                detail: this.translateService.instant('all.sync.dashboard.actions.clearAllError'),
              });
            },
            complete: () => this.actionLoading.set(false),
          });
      },
    });
  }

  clearCompletedJobs(): void {
    this.confirmationService.confirm({
      message: this.translateService.instant('all.sync.dashboard.actions.confirmClearCompleted'),
      header: this.translateService.instant('all.sync.dashboard.actions.clearCompleted'),
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-warning',
      accept: () => {
        this.actionLoading.set(true);
        this.syncApiService
          .clearCompletedJobs()
          .pipe(delay(this.queueMutationDelayMs))
          .subscribe({
            next: (result) => {
              this.messageService.add({
                severity: 'success',
                summary: this.translateService.instant('all.common.success'),
                detail: result.message || this.translateService.instant('all.sync.dashboard.actions.clearCompletedSuccess'),
              });
              this.overviewService.refresh();
            },
            error: () => {
              this.messageService.add({
                severity: 'error',
                summary: this.translateService.instant('all.common.error'),
                detail: this.translateService.instant('all.sync.dashboard.actions.clearCompletedError'),
              });
            },
            complete: () => this.actionLoading.set(false),
          });
      },
    });
  }

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
            this.overviewService.refresh();
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
          this.overviewService.refresh();
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

  toggleJobExpansion(job: SyncJob): void {
    if (job.children && job.children.length > 0) {
      this.overviewService.toggleJobExpansion(job.id);
    }
  }

  hasChildren(job: SyncJob): boolean {
    return !!(job.children && job.children.length > 0);
  }

  getJobIndentStyle(level: number): { 'padding-left': string } {
    return { 'padding-left': `${level * 20}px` };
  }

  getExpansionIcon(job: SyncJob): string {
    if (!this.hasChildren(job)) return '';
    return job.expanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right';
  }

  getJobLevel(job: SyncJob & { level?: number }): number {
    return job.level || 0;
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
    if (!finishedAt && !processedAt) return '-';
    const startDate = this.getJobCreatedAt(job);
    if (!startDate) return '-';
    const endDate = finishedAt || processedAt;
    if (!endDate) return '-';
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins > 0) return `${diffMins}m ${diffSecs % 60}s`;
    return `${diffSecs}s`;
  }

  getJobCreatedAt(job: SyncJob): Date | undefined {
    if (job.createdAt) {
      const d = dayjs(job.createdAt);
      return d.isValid() ? d.toDate() : undefined;
    }
    if (job.timestamp) {
      const d = dayjs(job.timestamp);
      return d.isValid() ? d.toDate() : undefined;
    }
    return undefined;
  }

  getJobProcessedAt(job: SyncJob): Date | undefined {
    if (!job.processedOn) return undefined;
    const d = dayjs(job.processedOn);
    return d.isValid() ? d.toDate() : undefined;
  }

  getJobFinishedAt(job: SyncJob): Date | undefined {
    if (!job.finishedOn) return undefined;
    const d = dayjs(job.finishedOn);
    return d.isValid() ? d.toDate() : undefined;
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
      if (displayName && typeof displayName === 'string') return displayName;

      return job.name || 'Unknown';
    } catch {
      return job.name || 'Unknown';
    }
  }

  getJobError(job: SyncJob): string | undefined {
    return job.failedReason;
  }
}
