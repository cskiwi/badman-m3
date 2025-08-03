// Queue Names - Each processor gets its own queue
export const TOURNAMENT_DISCOVERY_QUEUE = 'tournament-discovery';
export const COMPETITION_EVENT_QUEUE = 'competition-event';
export const TOURNAMENT_EVENT_QUEUE = 'tournament-event';
export const TEAM_MATCHING_QUEUE = 'team-matching';

// Legacy queue name for backwards compatibility
export const SYNC_QUEUE = 'sync';

// Job Types
export enum SyncJobType {
  TOURNAMENT_DISCOVERY = 'tournament-discovery',
  COMPETITION_STRUCTURE_SYNC = 'competition-structure-sync',
  COMPETITION_GAME_SYNC = 'competition-game-sync',
  TOURNAMENT_STRUCTURE_SYNC = 'tournament-structure-sync',
  TOURNAMENT_GAME_SYNC = 'tournament-game-sync',
  TEAM_MATCHING = 'team-matching',
}

// Array of all queue names for easy iteration
export const ALL_SYNC_QUEUES = [
  SYNC_QUEUE,
  TOURNAMENT_DISCOVERY_QUEUE,
  COMPETITION_EVENT_QUEUE,
  TOURNAMENT_EVENT_QUEUE,
  TEAM_MATCHING_QUEUE,
] as const;

// Queue to job type mapping for easy reference
export const QUEUE_JOB_TYPE_MAP = {
  [TOURNAMENT_DISCOVERY_QUEUE]: [SyncJobType.TOURNAMENT_DISCOVERY],
  [COMPETITION_EVENT_QUEUE]: [SyncJobType.COMPETITION_STRUCTURE_SYNC, SyncJobType.COMPETITION_GAME_SYNC],
  [TOURNAMENT_EVENT_QUEUE]: [SyncJobType.TOURNAMENT_STRUCTURE_SYNC, SyncJobType.TOURNAMENT_GAME_SYNC],
  [TEAM_MATCHING_QUEUE]: [SyncJobType.TEAM_MATCHING],
  [SYNC_QUEUE]: [], // Legacy queue
} as const;

// Job Data Interfaces
export interface TournamentDiscoveryJobData {
  refDate?: string;
  pageSize?: number;
  searchTerm?: string;
}

export interface StructureSyncJobData {
  tournamentCode: string;
  eventCodes?: string[];
  forceUpdate?: boolean;
  includeSubComponents?: boolean;
}

export interface GameSyncJobData {
  tournamentCode: string;
  eventCode?: string;
  drawCode?: string;
  matchCodes?: string[];
  date?: string;
}

export interface TeamMatchingJobData {
  tournamentCode: string;
  eventCode?: string;
  unmatchedTeams?: Array<{
    externalCode: string;
    externalName: string;
    normalizedName: string;
    clubName: string;
    teamNumber?: number;
    gender?: string;
    strength?: number;
  }>;
}
