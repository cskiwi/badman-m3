import { BullModule } from '@nestjs/bull';

export const TOURNAMENT_SYNC_QUEUE = 'tournament-sync';

export const TournamentSyncQueueModule = BullModule.registerQueue({
  name: TOURNAMENT_SYNC_QUEUE,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Job Types
export enum TournamentSyncJobType {
  TOURNAMENT_DISCOVERY = 'tournament-discovery',
  COMPETITION_STRUCTURE_SYNC = 'competition-structure-sync',
  COMPETITION_GAME_SYNC = 'competition-game-sync',
  TOURNAMENT_STRUCTURE_SYNC = 'tournament-structure-sync',
  TOURNAMENT_GAME_SYNC = 'tournament-game-sync',
  TEAM_MATCHING = 'team-matching',
}

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