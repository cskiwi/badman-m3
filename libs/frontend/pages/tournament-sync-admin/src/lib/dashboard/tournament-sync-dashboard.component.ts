import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// PrimeNG Components
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TranslateModule } from '@ngx-translate/core';

import { MessageService, ConfirmationService } from 'primeng/api';

interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface TournamentSyncJob {
  id: string;
  type: string;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  data: any;
  progress: number;
  createdAt: Date;
  processedAt?: Date;
  finishedAt?: Date;
  error?: string;
}

interface Tournament {
  id: string;
  visualCode: string;
  name: string;
  type: 'competition' | 'tournament';
  status: string;
  startDate: Date;
  endDate: Date;
  lastSyncAt?: Date;
  syncStatus: 'never' | 'syncing' | 'success' | 'error';
}

@Component({
  selector: 'app-tournament-sync-dashboard',
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
    ConfirmDialogModule,
    TranslateModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './tournament-sync-dashboard.component.html',
  styleUrl: './tournament-sync-dashboard.component.scss'
})
export class TournamentSyncDashboardComponent implements OnInit {
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  // State signals
  loading = signal(false);
  loadingStats = signal(false);
  loadingJobs = signal(false);
  loadingTournaments = signal(false);

  queueStats = signal<QueueStats | null>(null);
  recentJobs = signal<TournamentSyncJob[]>([]);
  tournaments = signal<Tournament[]>([]);

  // Filter state
  searchTerm = '';
  selectedType: string | null = null;
  selectedStatus: string | null = null;

  // Dropdown options
  typeOptions = [
    { label: 'All Types', value: null },
    { label: 'Competition', value: 'competition' },
    { label: 'Tournament', value: 'tournament' }
  ];

  statusOptions = [
    { label: 'All Statuses', value: null },
    { label: 'Active', value: 'active' },
    { label: 'Finished', value: 'finished' },
    { label: 'Cancelled', value: 'cancelled' }
  ];

  // Computed filtered tournaments
  filteredTournaments = computed(() => {
    let filtered = this.tournaments();

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(search) ||
        t.visualCode.toLowerCase().includes(search)
      );
    }

    if (this.selectedType) {
      filtered = filtered.filter(t => t.type === this.selectedType);
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(t => t.status === this.selectedStatus);
    }

    return filtered;
  });

  ngOnInit(): void {
    this.loadDashboardData();
    this.startPolling();
  }

  private async loadDashboardData(): Promise<void> {
    await Promise.all([
      this.loadQueueStats(),
      this.loadRecentJobs(),
      this.loadTournaments()
    ]);
  }

  private async loadQueueStats(): Promise<void> {
    this.loadingStats.set(true);
    try {
      // TODO: Replace with actual API call
      const stats: QueueStats = {
        waiting: 5,
        active: 2,
        completed: 150,
        failed: 3
      };
      this.queueStats.set(stats);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load queue statistics'
      });
    } finally {
      this.loadingStats.set(false);
    }
  }

  private async loadRecentJobs(): Promise<void> {
    this.loadingJobs.set(true);
    try {
      // TODO: Replace with actual API call
      const jobs: TournamentSyncJob[] = [
        {
          id: 'job-001',
          type: 'tournament-discovery',
          status: 'completed',
          data: {},
          progress: 100,
          createdAt: new Date(Date.now() - 3600000),
          processedAt: new Date(Date.now() - 3500000),
          finishedAt: new Date(Date.now() - 3400000)
        },
        {
          id: 'job-002',
          type: 'competition-structure-sync',
          status: 'active',
          data: { tournamentCode: 'ABC123' },
          progress: 65,
          createdAt: new Date(Date.now() - 1800000),
          processedAt: new Date(Date.now() - 1700000)
        }
      ];
      this.recentJobs.set(jobs);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load recent jobs'
      });
    } finally {
      this.loadingJobs.set(false);
    }
  }

  private async loadTournaments(): Promise<void> {
    this.loadingTournaments.set(true);
    try {
      // TODO: Replace with actual API call
      const tournaments: Tournament[] = [
        {
          id: '1',
          visualCode: 'C3B7B9D5-902B-40B8-939B-30A14C01F5AC',
          name: 'PBO Competitie 2025-2026',
          type: 'competition',
          status: 'active',
          startDate: new Date('2025-09-01'),
          endDate: new Date('2026-04-30'),
          lastSyncAt: new Date(Date.now() - 86400000),
          syncStatus: 'success'
        },
        {
          id: '2',
          visualCode: '3BAC39DE-2E82-4655-8269-4D83777598BA',
          name: 'Lokerse Volvo International 2025',
          type: 'tournament',
          status: 'finished',
          startDate: new Date('2025-04-26'),
          endDate: new Date('2025-04-27'),
          lastSyncAt: new Date(Date.now() - 7200000),
          syncStatus: 'success'
        }
      ];
      this.tournaments.set(tournaments);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load tournaments'
      });
    } finally {
      this.loadingTournaments.set(false);
    }
  }

  private startPolling(): void {
    // Poll queue stats every 30 seconds
    setInterval(() => {
      this.loadQueueStats();
    }, 30000);

    // Poll recent jobs every 10 seconds
    setInterval(() => {
      this.loadRecentJobs();
    }, 10000);
  }

  async triggerDiscoverySync(): Promise<void> {
    this.loading.set(true);
    try {
      // TODO: Call tournament sync service
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Tournament discovery sync started'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to start discovery sync'
      });
    } finally {
      this.loading.set(false);
    }
  }

  async triggerManualSync(): Promise<void> {
    this.confirmationService.confirm({
      message: 'Are you sure you want to trigger a manual sync of all tournaments?',
      header: 'Manual Sync Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        this.loading.set(true);
        try {
          // TODO: Call tournament sync service
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Manual sync started for all tournaments'
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to start manual sync'
          });
        } finally {
          this.loading.set(false);
        }
      }
    });
  }

  async syncTournament(tournament: Tournament): Promise<void> {
    try {
      // TODO: Call tournament sync service for specific tournament
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Structure sync started for ${tournament.name}`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to sync ${tournament.name}`
      });
    }
  }

  async syncTournamentGames(tournament: Tournament): Promise<void> {
    try {
      // TODO: Call tournament sync service for game sync
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Game sync started for ${tournament.name}`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to sync games for ${tournament.name}`
      });
    }
  }

  onSearchChange(): void {
    // Trigger filtering
  }

  onFilterChange(): void {
    // Trigger filtering
  }

  viewJobDetails(job: TournamentSyncJob): void {
    // TODO: Open job details dialog or navigate to details page
    console.log('View job details:', job);
  }

  retryJob(job: TournamentSyncJob): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to retry job ${job.id}?`,
      header: 'Retry Job',
      icon: 'pi pi-refresh',
      accept: async () => {
        try {
          // TODO: Call retry API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Job ${job.id} queued for retry`
          });
          
          // Reload jobs
          this.loadRecentJobs();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to retry job ${job.id}`
          });
        }
      }
    });
  }

  getJobStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'completed': return 'success';
      case 'active': return 'info';
      case 'waiting': return 'warning';
      case 'failed': return 'danger';
      default: return 'info';
    }
  }

  getTournamentStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'active': return 'success';
      case 'finished': return 'info';
      case 'cancelled': return 'danger';
      case 'postponed': return 'warning';
      default: return 'info';
    }
  }

  getSyncStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    switch (status) {
      case 'success': return 'success';
      case 'syncing': return 'info';
      case 'error': return 'danger';
      case 'never': return 'warning';
      default: return 'info';
    }
  }

  getDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs % 60}s`;
    }
    return `${diffSecs}s`;
  }

  getCurrentTime(): Date {
    return new Date();
  }
}