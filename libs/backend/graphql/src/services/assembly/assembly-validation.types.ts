import {
  CompetitionDraw,
  CompetitionEncounter,
  CompetitionEvent,
  CompetitionSubEvent,
  Player,
  RankingLastPlace,
  RankingPlace,
  RankingSystem,
  Team,
} from '@app/models';
import { AssemblyValidationError, PlayerRankingType } from './assembly-output';

export interface EntryCompetitionPlayer {
  id: string;
  single?: number;
  double?: number;
  mix?: number;
  gender?: string;
  levelException?: boolean;
  levelExceptionGiven?: boolean;
}

export interface MetaCompetition {
  teamIndex?: number;
  players?: EntryCompetitionPlayer[];
}

export interface EntryMeta {
  competition?: MetaCompetition;
}

export interface PlayerWithRanking extends Omit<Player, 'rankingLastPlaces' | 'rankingPlaces'> {
  rankingLastPlaces?: RankingLastPlace[];
  rankingPlaces?: RankingPlace[];
}

export interface ValidationData {
  type?: string;
  meta?: EntryMeta;
  otherMeta?: EntryMeta[];
  team?: Team;
  previousSeasonTeam?: Team | null;
  teamIndex?: number;
  teamPlayers?: PlayerWithRanking[];
  encounter?: CompetitionEncounter;
  draw?: CompetitionDraw;
  subEvent?: CompetitionSubEvent;
  event?: CompetitionEvent;
  system?: RankingSystem;
  single1?: PlayerWithRanking;
  single2?: PlayerWithRanking;
  single3?: PlayerWithRanking;
  single4?: PlayerWithRanking;
  double1?: [PlayerWithRanking, PlayerWithRanking];
  double2?: [PlayerWithRanking, PlayerWithRanking];
  double3?: [PlayerWithRanking, PlayerWithRanking];
  double4?: [PlayerWithRanking, PlayerWithRanking];
  subtitudes?: PlayerWithRanking[];
}

export interface ValidationResult {
  valid: boolean;
  errors: AssemblyValidationError[];
  warnings?: AssemblyValidationError[];
}
