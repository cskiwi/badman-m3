import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import moment from 'moment';

// PrimeNG Components
import { TranslateModule } from '@ngx-translate/core';
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
export class SyncDashboardComponent {
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private syncService = inject(SyncDashboardService);

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

  // Dropdown options
  typeOptions = [
    { label: 'All Types', value: null },
    { label: 'Competition', value: 'competition' },
    { label: 'Tournament', value: 'tournament' },
  ];

  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Active', value: 'active' },
    { label: 'Finished', value: 'finished' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

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

  constructor() {
    // WebSocket service now handles real-time updates automatically
    // No need for polling intervals
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
      message: `Are you sure you want to retry job ${job.id}?`,
      header: 'Retry Job',
      icon: 'pi pi-refresh',
      accept: async () => {
        try {
          // TODO: Call retry API
          await new Promise((resolve) => setTimeout(resolve, 500));

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Job ${job.id} queued for retry`,
          });

          // Refresh jobs
          this.syncService.refresh();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to retry job ${job.id}`,
          });
        }
      },
    });
  }

  getJobStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'info';
      case 'waiting':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'info';
    }
  }

  getTournamentStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'active':
        return 'success';
      case 'finished':
        return 'info';
      case 'cancelled':
        return 'danger';
      case 'postponed':
        return 'warning';
      default:
        return 'info';
    }
  }

  getSyncStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'success':
        return 'success';
      case 'syncing':
        return 'info';
      case 'error':
        return 'danger';
      case 'never':
        return 'warning';
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
      const momentDate = moment(job.createdAt);
      return momentDate.isValid() ? momentDate.toDate() : undefined;
    }

    if (job.timestamp) {
      const momentFromTimestamp = moment(job.timestamp);
      return momentFromTimestamp.isValid() ? momentFromTimestamp.toDate() : undefined;
    }

    return undefined;
  }

  getJobProcessedAt(job: SyncJob): Date | undefined {
    if (!job.processedOn) {
      return undefined;
    }

    const momentDate = moment(job.processedOn);
    return momentDate.isValid() ? momentDate.toDate() : undefined;
  }

  getJobFinishedAt(job: SyncJob): Date | undefined {
    if (!job.finishedOn) {
      return undefined;
    }

    const momentDate = moment(job.finishedOn);
    return momentDate.isValid() ? momentDate.toDate() : undefined;
  }

  getJobType(job: SyncJob): string {
    return job.name || 'Unknown';
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
