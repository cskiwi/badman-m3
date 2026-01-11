import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';
import { SyncJob, SyncStatus, SyncTriggerResponse } from '../models/sync.models';

// GraphQL Queries and Mutations
const GET_SYNC_STATUS = gql`
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
`;

const GET_SYNC_JOBS = gql`
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
      timestamp
      parentId
    }
  }
`;

const TRIGGER_DISCOVERY_SYNC = gql`
  mutation TriggerDiscoverySync {
    triggerDiscoverySync {
      message
      success
    }
  }
`;

const TRIGGER_COMPETITION_SYNC = gql`
  mutation TriggerCompetitionSync {
    triggerCompetitionSync {
      message
      success
    }
  }
`;

const TRIGGER_TOURNAMENT_SYNC = gql`
  mutation TriggerTournamentSync {
    triggerTournamentSync {
      message
      success
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class SyncApiService {
  private apollo = inject(Apollo);

  /**
   * Get sync worker status and queue statistics
   */
  getStatus(): Observable<SyncStatus> {
    return this.apollo
      .query<{ syncStatus: SyncStatus }>({
        query: GET_SYNC_STATUS,
      })
      .pipe(map((result) => result.data?.syncStatus ?? {} as SyncStatus));
  }

  /**
   * Trigger discovery sync
   */
  triggerDiscoverySync(): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerDiscoverySync: SyncTriggerResponse }>({
        mutation: TRIGGER_DISCOVERY_SYNC,
      })
      .pipe(map((result) => result.data?.triggerDiscoverySync ?? {} as SyncTriggerResponse));
  }

  /**
   * Trigger competition structure sync
   */
  triggerCompetitionSync(): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerCompetitionSync: SyncTriggerResponse }>({
        mutation: TRIGGER_COMPETITION_SYNC,
      })
      .pipe(map((result) => result.data?.triggerCompetitionSync ?? {} as SyncTriggerResponse));
  }

  /**
   * Trigger tournament structure sync
   */
  triggerTournamentSync(): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerTournamentSync: SyncTriggerResponse }>({
        mutation: TRIGGER_TOURNAMENT_SYNC,
      })
      .pipe(map((result) => result.data?.triggerTournamentSync ?? {} as SyncTriggerResponse));
  }

  /**
   * Get recent jobs from the queue
   */
  getRecentJobs(limit?: number | null, status?: string): Observable<SyncJob[]> {
    console.log('Fetching recent sync jobs with limit:', limit, 'and status:', status);

    return this.apollo
      .query<{ syncJobs: SyncJob[] }>({
        query: GET_SYNC_JOBS,
        variables: { limit, status },
      })
      .pipe(map((result) => result.data?.syncJobs ?? []));
  }
}
