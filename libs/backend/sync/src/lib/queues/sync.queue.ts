import { TournamentWorkPlan } from '../processors/services/tournament-planning.service';

// Queue Names - Each processor gets its own queue
export const TOURNAMENT_DISCOVERY_QUEUE = 'tournament-discovery';
export const COMPETITION_EVENT_QUEUE = 'competition-event';
export const TOURNAMENT_EVENT_QUEUE = 'tournament-event';
export const TEAM_MATCHING_QUEUE = 'team-matching';
export const RANKING_SYNC_QUEUE = 'ranking-sync';
export const RANKING_CALC_QUEUE = 'ranking-calc';

// Legacy queue name for backwards compatibility
export const SYNC_QUEUE = 'sync';

// Unified Job Naming System
// Jobs are named using a clear, hierarchical pattern:
// {eventType}-{operation}-{scope?}
// Examples: "tournament-sync-structure", "competition-sync-games", "tournament-discovery"

export const JOB_TYPES = {
  // Discovery jobs
  TOURNAMENT_DISCOVERY: 'tournament-discovery',
  TOURNAMENT_ADD_BY_CODE: 'tournament-add-by-code',
  // Badmintonvlaanderen.be calendar scraping
  TOURNAMENT_SCRAPE_YEAR: 'tournament-scrape-year',
  TOURNAMENT_SCRAPE_EVENT: 'tournament-scrape-event',
  TOURNAMENT_SCRAPE_YEAR_CLEANUP: 'tournament-scrape-year-cleanup',

  // Structure sync jobs (events, draws, entries)
  TOURNAMENT_STRUCTURE_SYNC: 'tournament-structure-sync',
  COMPETITION_STRUCTURE_SYNC: 'competition-structure-sync',
  // Game sync jobs
  TOURNAMENT_GAME_SYNC: 'tournament-games-sync',
  COMPETITION_GAME_SYNC: 'competition-games-sync',
  // Encounter sync jobs
  COMPETITION_ENCOUNTER_SYNC: 'competition-encounter-sync',
  // Team matching
  TEAM_MATCHING: 'team-matching',
  // Ranking point recalculation
  TOURNAMENT_RANKING_RECALC: 'tournament-ranking-recalc',
  // BBF Rating ranking sync
  RANKING_SYNC_INIT: 'ranking-sync-init',
  RANKING_SYNC_PUBLICATION: 'ranking-sync-publication',
  // Self-calculated ranking (non-VISUAL systems)
  RANKING_CALC_INIT: 'ranking-calc-init',
  RANKING_CALC_PERIOD: 'ranking-calc-period',
  RANKING_CALC_PLAYER_BATCH: 'ranking-calc-player-batch',
  RANKING_CALC_FINALIZE: 'ranking-calc-finalize',
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
  RANKING_SYNC_QUEUE,
  RANKING_CALC_QUEUE,
] as const;

// Queue to job type mapping for easy reference
export const QUEUE_JOB_TYPE_MAP = {
  [TOURNAMENT_DISCOVERY_QUEUE]: [JOB_TYPES.TOURNAMENT_DISCOVERY, JOB_TYPES.TOURNAMENT_ADD_BY_CODE, JOB_TYPES.TOURNAMENT_SCRAPE_YEAR, JOB_TYPES.TOURNAMENT_SCRAPE_EVENT, JOB_TYPES.TOURNAMENT_SCRAPE_YEAR_CLEANUP],
  [COMPETITION_EVENT_QUEUE]: [JOB_TYPES.COMPETITION_STRUCTURE_SYNC, JOB_TYPES.COMPETITION_GAME_SYNC],
  [TOURNAMENT_EVENT_QUEUE]: [JOB_TYPES.TOURNAMENT_STRUCTURE_SYNC, JOB_TYPES.TOURNAMENT_GAME_SYNC, JOB_TYPES.TOURNAMENT_RANKING_RECALC],
  [TEAM_MATCHING_QUEUE]: [JOB_TYPES.TEAM_MATCHING],
  [RANKING_SYNC_QUEUE]: [JOB_TYPES.RANKING_SYNC_INIT, JOB_TYPES.RANKING_SYNC_PUBLICATION],
  [RANKING_CALC_QUEUE]: [JOB_TYPES.RANKING_CALC_INIT, JOB_TYPES.RANKING_CALC_PERIOD, JOB_TYPES.RANKING_CALC_PLAYER_BATCH, JOB_TYPES.RANKING_CALC_FINALIZE],
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

export interface TournamentAddByCodeJobData {
  visualCode: string;
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

export interface TournamentSyncJobData extends StructureSyncJobData {
  workPlan?: TournamentWorkPlan;
}

export interface GameSyncJobData {
  tournamentCode: string;
  eventCode?: string;
  drawCode?: string;
  drawId?: string;
  matchCodes?: string[];
  date?: string;
  // Display metadata
  metadata?: JobDisplayMetadata;
}

export interface TournamentRankingRecalcJobData {
  tournamentId: string;
  action: 'create' | 'remove';
  metadata?: JobDisplayMetadata;
}

export interface RankingSyncInitJobData {
  startDate?: string; // ISO date string, defaults to system's updateLastUpdate
  metadata?: JobDisplayMetadata;
}

export interface RankingSyncCategoryData {
  code: string;
  name: string;
}

export interface RankingSyncPublicationJobData {
  rankingCode: string;
  systemId: string;
  publicationCode: string;
  publicationDate: string; // ISO date string
  usedForUpdate: boolean;
  categories: RankingSyncCategoryData[];
  isLastPublication: boolean;
  metadata?: JobDisplayMetadata;
}

// Self-calculated ranking job data interfaces (non-VISUAL systems)

export interface RankingCalcInitJobData {
  systemId: string;
  calcDate: string;      // ISO — the snapshot date
  isUpdateDate: boolean; // true when level changes are allowed
  metadata?: JobDisplayMetadata;
}

export interface RankingCalcPeriodJobData {
  systemId: string;
  periodDate: string;  // ISO — becomes RankingPlace.rankingDate
  windowStart: string; // ISO — periodDate - periodAmount/periodUnit
  windowEnd: string;   // ISO — same as periodDate (exclusive upper bound)
  isUpdateDate: boolean;
  metadata?: JobDisplayMetadata;
}

export interface RankingCalcPlayerBatchJobData {
  systemId: string;
  periodDate: string;
  windowStart: string;
  windowEnd: string;
  playerIds: string[]; // IDs of players in this batch (~100 per batch)
  isUpdateDate: boolean;
  batchKey: string;    // Redis key: ranking-calc:{systemId}:{periodDate}:remaining
  metadata?: JobDisplayMetadata;
}

export interface RankingCalcFinalizeJobData {
  systemId: string;
  calcDate: string;
  isUpdateDate: boolean;
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

export interface TournamentScrapeYearJobData {
  year: number;
  /** Whether to queue individual event scrape jobs (default: true) */
  runAdding?: boolean;
  /** Whether to queue the year cleanup job to mark absent tournaments (default: true) */
  runCleanup?: boolean;
  metadata?: JobDisplayMetadata;
}

export interface TournamentScrapeEventJobData {
  year: number;
  eventUrl: string;
  eventName: string;
  metadata?: JobDisplayMetadata;
}

export interface TournamentScrapeYearCleanupJobData {
  year: number;
  metadata?: JobDisplayMetadata;
}
