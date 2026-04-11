import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Apollo, gql } from 'apollo-angular';
import { CompetitionEvent, TournamentEvent } from '@app/models';
import { RankingSystemSyncInfo, SyncJob, SyncStatus, SyncTriggerResponse } from '../models/sync.models';

// ===== Queries =====

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

// Competition event queries at different depths
const GET_COMPETITION_EVENTS_LEVEL_EVENT = gql`
  query CompetitionEventsForSync($args: CompetitionEventArgs) {
    competitionEvents(args: $args) {
      id
      name
      official
      type
      season
      openDate
      closeDate
      lastSync
      visualCode
    }
  }
`;

const GET_COMPETITION_EVENTS_LEVEL_SUBEVENT = gql`
  query CompetitionEventsForSyncSubEvent($args: CompetitionEventArgs) {
    competitionEvents(args: $args) {
      id
      name
      official
      type
      season
      openDate
      closeDate
      lastSync
      visualCode
      competitionSubEvents {
        id
        name
        level
        maxLevel
      }
    }
  }
`;

const GET_COMPETITION_EVENTS_LEVEL_DRAW = gql`
  query CompetitionEventsForSyncDraw($args: CompetitionEventArgs) {
    competitionEvents(args: $args) {
      id
      name
      official
      type
      season
      openDate
      closeDate
      lastSync
      visualCode
      competitionSubEvents {
        id
        name
        level
        maxLevel
        competitionDraws {
          id
          name
          visualCode
        }
      }
    }
  }
`;

const GET_COMPETITION_EVENTS_LEVEL_ENCOUNTER = gql`
  query CompetitionEventsForSyncEncounter($args: CompetitionEventArgs) {
    competitionEvents(args: $args) {
      id
      name
      official
      type
      season
      openDate
      closeDate
      lastSync
      visualCode
      competitionSubEvents {
        id
        name
        level
        maxLevel
        competitionDraws {
          id
          name
          visualCode
          competitionEncounters {
            id
            visualCode
            date
            homeTeam {
              name
            }
            awayTeam {
              name
            }
          }
        }
      }
    }
  }
`;

// Tournament event queries at different depths
const GET_TOURNAMENT_EVENTS_LEVEL_EVENT = gql`
  query TournamentEventsForSync($args: TournamentEventArgs) {
    tournamentEvents(args: $args) {
      id
      name
      official
      firstDay
      openDate
      closeDate
      lastSync
      visualCode
      phase
    }
  }
`;

const GET_TOURNAMENT_EVENTS_LEVEL_SUBEVENT = gql`
  query TournamentEventsForSyncSubEvent($args: TournamentEventArgs) {
    tournamentEvents(args: $args) {
      id
      name
      official
      firstDay
      openDate
      closeDate
      lastSync
      visualCode
      phase
      tournamentSubEvents {
        id
        name
        minLevel
        maxLevel
      }
    }
  }
`;

const GET_TOURNAMENT_EVENTS_LEVEL_DRAW = gql`
  query TournamentEventsForSyncDraw($args: TournamentEventArgs) {
    tournamentEvents(args: $args) {
      id
      name
      official
      firstDay
      openDate
      closeDate
      lastSync
      visualCode
      phase
      tournamentSubEvents {
        id
        name
        minLevel
        maxLevel
        drawTournaments {
          id
          name
          visualCode
        }
      }
    }
  }
`;

// ===== Mutations =====

const TRIGGER_DISCOVERY_SYNC = gql`
  mutation TriggerDiscoverySync {
    triggerDiscoverySync {
      message
      success
    }
  }
`;

const TRIGGER_RANKING_SYNC = gql`
  mutation TriggerRankingSync($startDate: String) {
    triggerRankingSync(startDate: $startDate) {
      message
      success
    }
  }
`;

const TRIGGER_RANKING_CALC = gql`
  mutation TriggerRankingCalc($systemId: ID!, $startDate: String, $stopDate: String) {
    triggerRankingCalc(systemId: $systemId, startDate: $startDate, stopDate: $stopDate) {
      message
      success
    }
  }
`;

const GET_RANKING_SYSTEMS = gql`
  query GetRankingSystemsForSync {
    rankingSystems {
      id
      name
      rankingSystem
      runCurrently
      calculationLastUpdate
      updateLastUpdate
      calculationIntervalAmount
      calculationIntervalUnit
      updateIntervalAmount
      updateIntervalUnit
    }
  }
`;

const CLEAR_ALL_JOBS = gql`
  mutation ClearAllJobs {
    clearAllJobs {
      message
      success
    }
  }
`;

const CLEAR_COMPLETED_JOBS = gql`
  mutation ClearCompletedJobs {
    clearCompletedJobs {
      message
      success
    }
  }
`;

const TRIGGER_EVENTS_SYNC = gql`
  mutation TriggerEventsSync($eventIds: [ID!]!, $includeSubComponents: Boolean!) {
    triggerEventsSync(eventId: $eventIds, includeSubComponents: $includeSubComponents) {
      message
      success
    }
  }
`;

const TRIGGER_SUB_EVENTS_SYNC = gql`
  mutation TriggerSubEventsSync($subEventIds: [ID!]!, $includeSubComponents: Boolean!) {
    triggerSubEventsSync(subEventIds: $subEventIds, includeSubComponents: $includeSubComponents) {
      message
      success
    }
  }
`;

const TRIGGER_DRAWS_SYNC = gql`
  mutation TriggerDrawsSync($drawIds: [ID!]!, $includeSubComponents: Boolean!) {
    triggerDrawsSync(drawIds: $drawIds, includeSubComponents: $includeSubComponents) {
      message
      success
    }
  }
`;

const TRIGGER_ENCOUNTERS_SYNC = gql`
  mutation TriggerEncountersSync($encounterIds: [ID!]!) {
    triggerEncountersSync(encounterIds: $encounterIds) {
      message
      success
    }
  }
`;

// Query map for competition events by sync level
const COMPETITION_QUERIES = {
  event: GET_COMPETITION_EVENTS_LEVEL_EVENT,
  subEvent: GET_COMPETITION_EVENTS_LEVEL_SUBEVENT,
  draw: GET_COMPETITION_EVENTS_LEVEL_DRAW,
  encounter: GET_COMPETITION_EVENTS_LEVEL_ENCOUNTER,
} as const;

// Query map for tournament events by sync level
const TOURNAMENT_QUERIES = {
  event: GET_TOURNAMENT_EVENTS_LEVEL_EVENT,
  subEvent: GET_TOURNAMENT_EVENTS_LEVEL_SUBEVENT,
  draw: GET_TOURNAMENT_EVENTS_LEVEL_DRAW,
} as const;

@Injectable({
  providedIn: 'root',
})
export class SyncApiService {
  private apollo = inject(Apollo);

  getStatus(): Observable<SyncStatus> {
    return this.apollo
      .query<{ syncStatus: SyncStatus }>({
        query: GET_SYNC_STATUS,
      })
      .pipe(map((result) => result.data?.syncStatus ?? ({} as SyncStatus)));
  }

  getRecentJobs(limit?: number | null, status?: string): Observable<SyncJob[]> {
    return this.apollo
      .query<{ syncJobs: SyncJob[] }>({
        query: GET_SYNC_JOBS,
        variables: { limit, status },
      })
      .pipe(map((result) => result.data?.syncJobs ?? []));
  }

  getCompetitionEvents(args: Record<string, unknown>, syncLevel: 'event' | 'subEvent' | 'draw' | 'encounter'): Observable<CompetitionEvent[]> {
    return this.apollo
      .query<{ competitionEvents: CompetitionEvent[] }>({
        query: COMPETITION_QUERIES[syncLevel],
        variables: { args },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.competitionEvents ?? []));
  }

  getTournamentEvents(args: Record<string, unknown>, syncLevel: 'event' | 'subEvent' | 'draw'): Observable<TournamentEvent[]> {
    return this.apollo
      .query<{ tournamentEvents: TournamentEvent[] }>({
        query: TOURNAMENT_QUERIES[syncLevel],
        variables: { args },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.tournamentEvents ?? []));
  }

  triggerDiscoverySync(): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerDiscoverySync: SyncTriggerResponse }>({
        mutation: TRIGGER_DISCOVERY_SYNC,
      })
      .pipe(map((result) => result.data?.triggerDiscoverySync ?? ({} as SyncTriggerResponse)));
  }

  triggerRankingSync(startDate?: string): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerRankingSync: SyncTriggerResponse }>({
        mutation: TRIGGER_RANKING_SYNC,
        variables: { startDate },
      })
      .pipe(map((result) => result.data?.triggerRankingSync ?? ({} as SyncTriggerResponse)));
  }

  triggerRankingCalc(systemId: string, startDate?: string, stopDate?: string): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerRankingCalc: SyncTriggerResponse }>({
        mutation: TRIGGER_RANKING_CALC,
        variables: { systemId, startDate, stopDate },
      })
      .pipe(map((result) => result.data?.triggerRankingCalc ?? ({} as SyncTriggerResponse)));
  }

  getRankingSystems(): Observable<RankingSystemSyncInfo[]> {
    return this.apollo
      .query<{ rankingSystems: RankingSystemSyncInfo[] }>({
        query: GET_RANKING_SYSTEMS,
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.rankingSystems ?? []));
  }

  clearAllJobs(): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ clearAllJobs: SyncTriggerResponse }>({
        mutation: CLEAR_ALL_JOBS,
      })
      .pipe(map((result) => result.data?.clearAllJobs ?? ({} as SyncTriggerResponse)));
  }

  clearCompletedJobs(): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ clearCompletedJobs: SyncTriggerResponse }>({
        mutation: CLEAR_COMPLETED_JOBS,
      })
      .pipe(map((result) => result.data?.clearCompletedJobs ?? ({} as SyncTriggerResponse)));
  }

  triggerEventsSync(eventIds: string[], includeSubComponents: boolean): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerEventsSync: SyncTriggerResponse }>({
        mutation: TRIGGER_EVENTS_SYNC,
        variables: { eventIds, includeSubComponents },
      })
      .pipe(map((result) => result.data?.triggerEventsSync ?? ({} as SyncTriggerResponse)));
  }

  triggerSubEventsSync(subEventIds: string[], includeSubComponents: boolean): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerSubEventsSync: SyncTriggerResponse }>({
        mutation: TRIGGER_SUB_EVENTS_SYNC,
        variables: { subEventIds, includeSubComponents },
      })
      .pipe(map((result) => result.data?.triggerSubEventsSync ?? ({} as SyncTriggerResponse)));
  }

  triggerDrawsSync(drawIds: string[], includeSubComponents: boolean): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerDrawsSync: SyncTriggerResponse }>({
        mutation: TRIGGER_DRAWS_SYNC,
        variables: { drawIds, includeSubComponents },
      })
      .pipe(map((result) => result.data?.triggerDrawsSync ?? ({} as SyncTriggerResponse)));
  }

  triggerEncountersSync(encounterIds: string[]): Observable<SyncTriggerResponse> {
    return this.apollo
      .mutate<{ triggerEncountersSync: SyncTriggerResponse }>({
        mutation: TRIGGER_ENCOUNTERS_SYNC,
        variables: { encounterIds },
      })
      .pipe(map((result) => result.data?.triggerEncountersSync ?? ({} as SyncTriggerResponse)));
  }
}
