import { PlayerWithRanking } from '../page-assembly.service';

export interface SlotAssignment {
  single1?: PlayerWithRanking;
  single2?: PlayerWithRanking;
  single3?: PlayerWithRanking;
  single4?: PlayerWithRanking;
  double1?: [PlayerWithRanking, PlayerWithRanking];
  double2?: [PlayerWithRanking, PlayerWithRanking];
  double3?: [PlayerWithRanking, PlayerWithRanking];
  double4?: [PlayerWithRanking, PlayerWithRanking];
}

export interface GameRecord {
  gameType: string;
  gameOrder: number;
  player1Id: string;
  player2Id?: string;
  won: boolean;
  set1Team1?: number;
  set1Team2?: number;
  set2Team1?: number;
  set2Team2?: number;
  set3Team1?: number;
  set3Team2?: number;
}

export interface HistoryData {
  assemblies: Record<string, unknown>[];
  games: GameRecord[];
}

export interface OccupiedSlots {
  single1: boolean;
  single2: boolean;
  single3: boolean;
  single4: boolean;
  double1: boolean;
  double2: boolean;
  double3: boolean;
  double4: boolean;
  /** Player IDs already assigned in occupied single slots */
  preAssignedSingleIds: Set<string>;
  /** Slot → player for partial doubles (1 of 2 players placed) */
  partialDoubles: Map<string, PlayerWithRanking>;
  [key: string]: boolean | Set<string> | Map<string, PlayerWithRanking>;
}
