import { SurveyResponse } from './survey-response';

export interface TeamBuilderPlayer {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender?: 'M' | 'F';
  slug?: string;

  // Rankings (from RankingLastPlace)
  single: number;
  double: number;
  mix: number;

  // Survey data (optional, only populated after Excel import)
  survey?: SurveyResponse;

  // Performance flags
  lowPerformance: boolean;
  encounterPresencePercent: number;
  isNewPlayer: boolean;
  isStopping: boolean;

  // Level warning (set per-team context, e.g. player too strong/weak for the subevent)
  levelWarning?: string;

  // Current assignment in builder
  assignedTeamId?: string;
  membershipType: 'REGULAR' | 'BACKUP';
}

export interface TeamBuilderTeam {
  id: string;
  name: string;
  type: 'M' | 'F' | 'MX';
  teamNumber?: number;
  preferredDay?: string;
  captainId?: string;
  isNew: boolean;
  isPromoted: boolean;
  isMarkedForRemoval: boolean;

  // Sub-event constraints (from current competition)
  subEventId?: string;
  maxAllowedIndex?: number;
  minLevel?: number;
  maxLevel?: number;
  currentLevel?: number;

  // Computed validation (updated reactively)
  players: TeamBuilderPlayer[];
  teamIndex: number;
  isValid: boolean;
  validationErrors: string[];
}

export interface TeamBuilderState {
  teams: TeamBuilderTeam[];
  unassignedPlayers: TeamBuilderPlayer[];
  surveyImported: boolean;
}
