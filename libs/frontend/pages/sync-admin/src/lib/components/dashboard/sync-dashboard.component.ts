import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Components
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { ConfirmationService, MessageService } from 'primeng/api';
import { SyncJob, Tournament } from '../../models';
import { SyncDashboardService } from './sync-dashboard.service';

@Component({
  selector: 'app-sync-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    HttpClientModule,
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
    ConfirmDialogModule,
    TranslateModule,
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

  loading = this.syncService.loading;
  loadingStats = this.syncService.queueStatsLoading;
  loadingJobs = this.syncService.recentJobsLoading;
  loadingTournaments = this.syncService.tournamentsLoading;

  // Manual loading state for actions
  actionLoading = signal(false);

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
    // Poll data every 30 seconds using service refresh
    setInterval(() => {
      this.syncService.refresh();
    }, 30000);
  }

  async triggerDiscoverySync(): Promise<void> {
    this.actionLoading.set(true);
    try {
      const response = await this.syncService.triggerDiscoverySync();

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: response.message || 'Tournament discovery sync started',
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to start discovery sync',
      });
    } finally {
      this.actionLoading.set(false);
    }
  }

  async triggerManualSync(): Promise<void> {
    this.confirmationService.confirm({
      message: 'Are you sure you want to trigger a manual sync of all tournaments?',
      header: 'Manual Sync Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        this.actionLoading.set(true);
        try {
          // Trigger both competition and tournament sync
          await Promise.all([this.syncService.triggerCompetitionSync(), this.syncService.triggerTournamentSync()]);

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Manual sync started for all tournaments',
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to start manual sync',
          });
        } finally {
          this.actionLoading.set(false);
        }
      },
    });
  }

  async syncTournament(tournament: Tournament): Promise<void> {
    try {
      // TODO: Call tournament sync service for specific tournament
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Structure sync started for ${tournament.name}`,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to sync ${tournament.name}`,
      });
    }
  }

  async syncTournamentGames(tournament: Tournament): Promise<void> {
    try {
      // TODO: Call tournament sync service for game sync
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Game sync started for ${tournament.name}`,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to sync games for ${tournament.name}`,
      });
    }
  }

  onSearchChange(): void {
    // Trigger filtering
  }

  onFilterChange(): void {
    // Trigger filtering
  }

  viewJobDetails(job: SyncJob): void {
    // TODO: Open job details dialog or navigate to details page
    console.log('View job details:', job);
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

  getDuration(startMs: number, endMs: number): string {
    const diffMs = endMs - startMs;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs % 60}s`;
    }
    return `${diffSecs}s`;
  }

  getJobCreatedAt(job: SyncJob): Date {
    return new Date(); // Since we don't have timestamp in new interface
  }

  getJobProcessedAt(job: SyncJob): Date | undefined {
    return job.processedOn;
  }

  getJobFinishedAt(job: SyncJob): Date | undefined {
    return job.finishedOn;
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
}
