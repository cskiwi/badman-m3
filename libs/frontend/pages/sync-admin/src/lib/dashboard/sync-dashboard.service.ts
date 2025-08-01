import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, resource, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { AuthService } from '@app/frontend-modules-auth/service';
import { Apollo, gql } from 'apollo-angular';
import { lastValueFrom } from 'rxjs';

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface SyncJob {
  id: string;
  name: string;
  data: string;
  progress: number;
  processedOn?: Date;
  finishedOn?: Date;
  failedReason?: string;
  status: string;
}

export interface SyncStatus {
  status: string;
  timestamp: string;
  queues: QueueStats;
}

export interface Tournament {
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

export class SyncDashboardService {
  private readonly apollo = inject(Apollo);
  private readonly auth = inject(AuthService);

  // Filter form for reactive updates
  filter = new FormGroup({
    jobsLimit: new FormControl<number>(10),
    jobsStatus: new FormControl<string | null>(null),
    refreshInterval: new FormControl<number>(30000), // 30 seconds default
  });

  // Convert form to signal for resource
  private filterSignal = toSignal(this.filter.valueChanges);

  // Refresh trigger for manual updates
  private refreshTrigger = signal(0);

  // Queue Stats Resource
  private queueStatsResource = resource({
    params: computed(() => ({ refresh: this.refreshTrigger(), user: this.auth.loggedIn() })),
    loader: async ({ abortSignal, params: { user } }) => {
      try {
        // we need to skip the user check for SSR
        if (!user) {
          return null;
        }

        const result = await lastValueFrom(
          this.apollo.query<{ syncStatus: SyncStatus }>({
            query: gql`
              query GetSyncStatus {
                syncStatus {
                  status
                  timestamp
                  queues {
                    waiting
                    active
                    completed
                    failed
                  }
                }
              }
            `,
            context: { signal: abortSignal },
            fetchPolicy: 'network-only', // Always fetch fresh data
            // errorPolicy: 'all', // Continue even with GraphQL errors
          }),
        );

        return result?.data?.syncStatus || null;
      } catch (err) {
        console.warn('Failed to load sync status:', err);
        // Return null instead of throwing to prevent SSR crashes
        return null;
      }
    },
  });

  // Recent Jobs Resource
  private recentJobsResource = resource({
    params: computed(() => ({
      ...this.filterSignal(),
      refresh: this.refreshTrigger(),
    })),
    loader: async ({ params, abortSignal }) => {
      try {
        const result = await lastValueFrom(
          this.apollo.query<{ syncJobs: SyncJob[] }>({
            query: gql`
              query GetSyncJobs($limit: Int, $status: String) {
                syncJobs(limit: $limit, status: $status) {
                  id
                  name
                  data
                  progress
                  processedOn
                  finishedOn
                  failedReason
                  status
                }
              }
            `,
            variables: {
              limit: params?.jobsLimit || 10,
              status: params?.jobsStatus || undefined,
            },
            context: { signal: abortSignal },
            fetchPolicy: 'network-only', // Always fetch fresh data
            errorPolicy: 'all', // Continue even with GraphQL errors
          }),
        );

        return result?.data?.syncJobs || [];
      } catch (err) {
        console.warn('Failed to load sync jobs:', err);
        // Return empty array instead of throwing to prevent SSR crashes
        return [];
      }
    },
  });

  // Tournaments Resource (mock data for now)
  private tournamentsResource = resource({
    params: computed(() => ({ refresh: this.refreshTrigger() })),
    loader: async ({ abortSignal }) => {
      try {
        // TODO: Replace with actual GraphQL query when tournaments API is ready
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

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
            syncStatus: 'success',
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
            syncStatus: 'success',
          },
        ];

        return tournaments;
      } catch (err) {
        console.warn('Failed to load tournaments:', err);
        // Return empty array instead of throwing to prevent SSR crashes
        return [];
      }
    },
  });

  // Public computed selectors
  syncStatus = computed(() => this.queueStatsResource.value());
  queueStats = computed(() => this.queueStatsResource.value()?.queues);
  queueStatsLoading = computed(() => this.queueStatsResource.isLoading());
  queueStatsError = computed(() => this.queueStatsResource.error()?.message || null);

  recentJobs = computed(() => this.recentJobsResource.value() ?? []);
  recentJobsLoading = computed(() => this.recentJobsResource.isLoading());
  recentJobsError = computed(() => this.recentJobsResource.error()?.message || null);

  tournaments = computed(() => this.tournamentsResource.value() ?? []);
  tournamentsLoading = computed(() => this.tournamentsResource.isLoading());
  tournamentsError = computed(() => this.tournamentsResource.error()?.message || null);

  // Combined loading state
  loading = computed(() => this.queueStatsLoading() || this.recentJobsLoading() || this.tournamentsLoading());

  // Action methods
  async triggerDiscoverySync(): Promise<{ message: string; success: boolean }> {
    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerDiscoverySync: { message: string; success: boolean } }>({
          mutation: gql`
            mutation TriggerDiscoverySync {
              triggerDiscoverySync {
                message
                success
              }
            }
          `,
        }),
      );

      // Refresh data after successful trigger
      this.refresh();

      return result.data!.triggerDiscoverySync;
    } catch (err) {
      throw new Error(this.handleError(err as HttpErrorResponse));
    }
  }

  async triggerCompetitionSync(): Promise<{ message: string; success: boolean }> {
    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerCompetitionSync: { message: string; success: boolean } }>({
          mutation: gql`
            mutation TriggerCompetitionSync {
              triggerCompetitionSync {
                message
                success
              }
            }
          `,
        }),
      );

      // Refresh data after successful trigger
      this.refresh();

      return result.data!.triggerCompetitionSync;
    } catch (err) {
      throw new Error(this.handleError(err as HttpErrorResponse));
    }
  }

  async triggerTournamentSync(): Promise<{ message: string; success: boolean }> {
    try {
      const result = await lastValueFrom(
        this.apollo.mutate<{ triggerTournamentSync: { message: string; success: boolean } }>({
          mutation: gql`
            mutation TriggerTournamentSync {
              triggerTournamentSync {
                message
                success
              }
            }
          `,
        }),
      );

      // Refresh data after successful trigger
      this.refresh();

      return result.data!.triggerTournamentSync;
    } catch (err) {
      throw new Error(this.handleError(err as HttpErrorResponse));
    }
  }

  // Manual refresh method
  refresh(): void {
    this.refreshTrigger.update((val) => val + 1);
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
}
