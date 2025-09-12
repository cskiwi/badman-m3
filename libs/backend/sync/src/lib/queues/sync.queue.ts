import { TournamentWorkPlan } from '../processors/services/tournament-planning.service';

// Queue Names - Each processor gets its own queue
export const TOURNAMENT_DISCOVERY_QUEUE = 'tournament-discovery';
export const COMPETITION_EVENT_QUEUE = 'competition-event';
export const TOURNAMENT_EVENT_QUEUE = 'tournament-event';
export const TEAM_MATCHING_QUEUE = 'team-matching';

// Legacy queue name for backwards compatibility
export const SYNC_QUEUE = 'sync';

// Unified Job Naming System
// Jobs are named using a clear, hierarchical pattern:
// {eventType}-{operation}-{scope?}
// Examples: "tournament-sync-structure", "competition-sync-games", "tournament-discovery"

export const JOB_TYPES = {
  // Discovery jobs
  TOURNAMENT_DISCOVERY: 'tournament-discovery',

  // Structure sync jobs (events, draws, entries)
  TOURNAMENT_STRUCTURE_SYNC: 'tournament-structure-sync',
  COMPETITION_STRUCTURE_SYNC: 'competition-structure-sync',
// Game sync jobs
  TOURNAMENT_GAME_SYNC: 'tournament-games-sync', 
  COMPETITION_GAME_SYNC: 'competition-games-sync',
  // Team matching
  TEAM_MATCHING: 'team-matching',
} as const;

// Helper function to create dynamic job names
export function createJobName(
  eventType: 'tournament' | 'competition',
  operation: 'sync' | 'discovery' | 'matching',
  scope?: 'structure' | 'games' | 'events' | 'draws' | 'standings',
): string {
  if (operation === 'discovery') {
    return `${eventType}-discovery`;
  }
  if (operation === 'matching') {
    return `team-matching`;
  }
  return scope ? `${eventType}-${operation}-${scope}` : `${eventType}-${operation}`;
}

// Backward compatibility - will be deprecated
export enum SyncJobType {
  /** @deprecated Use JOB_TYPES.TOURNAMENT_DISCOVERY */
  TOURNAMENT_DISCOVERY = 'tournament-discovery',
  /** @deprecated Use createJobName('competition', 'sync', 'structure') */
  COMPETITION_STRUCTURE_SYNC = 'competition-structure-sync',
  /** @deprecated Use createJobName('competition', 'sync', 'games') */
  COMPETITION_GAME_SYNC = 'competition-games-sync',
  /** @deprecated Use createJobName('tournament', 'sync', 'structure') */
  TOURNAMENT_STRUCTURE_SYNC = 'tournament-structure-sync',
  /** @deprecated Use createJobName('tournament', 'sync', 'games') */
  TOURNAMENT_GAME_SYNC = 'tournament-games-sync',
  /** @deprecated Use JOB_TYPES.TEAM_MATCHING */
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
  [TOURNAMENT_DISCOVERY_QUEUE]: [JOB_TYPES.TOURNAMENT_DISCOVERY],
  [COMPETITION_EVENT_QUEUE]: [JOB_TYPES.COMPETITION_STRUCTURE_SYNC, JOB_TYPES.COMPETITION_GAME_SYNC],
  [TOURNAMENT_EVENT_QUEUE]: [JOB_TYPES.TOURNAMENT_STRUCTURE_SYNC, JOB_TYPES.TOURNAMENT_GAME_SYNC],
  [TEAM_MATCHING_QUEUE]: [JOB_TYPES.TEAM_MATCHING],
  [SYNC_QUEUE]: [], // Legacy queue
} as const;

// Base interface for job metadata
export interface JobDisplayMetadata {
  displayName?: string;
  description?: string;
  homeTeam?: {
    name: string;
    id?: string;
  };
  awayTeam?: {
    name: string;
    id?: string;
  };
  eventName?: string;
  drawName?: string;
  subEventName?: string;
}

// Job Data Interfaces
export interface TournamentDiscoveryJobData {
  refDate?: string;
  pageSize?: number;
  searchTerm?: string;
  // Display metadata
  metadata?: JobDisplayMetadata;
}

export interface StructureSyncJobData {
  tournamentCode: string;
  eventCode?: string;
  forceUpdate?: boolean;
  includeSubComponents?: boolean;
  // Display metadata
  metadata?: JobDisplayMetadata;
}

export interface TournamentStructureSyncJobData extends StructureSyncJobData {
  workPlan?: TournamentWorkPlan;
}

export interface GameSyncJobData {
  tournamentCode: string;
  eventCode?: string;
  drawCode?: string;
  matchCodes?: string[];
  date?: string;
  // Display metadata
  metadata?: JobDisplayMetadata;
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
  // Display metadata
  metadata?: JobDisplayMetadata;
}
