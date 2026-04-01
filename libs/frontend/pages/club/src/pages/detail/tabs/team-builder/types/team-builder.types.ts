import { CompetitionSubEvent, Player, Team } from '@app/models';
import { SurveyResponse } from './survey-response';

export type TeamBuilderStandingOutcome = 'PROMOTED' | 'DEMOTED' | 'UNCHANGED';

export const TEAM_BUILDER_AUTO_SUB_EVENT = '__AUTO__';

/**
 * Strips function properties from a class type, keeping only data properties.
 * GraphQL response objects are plain objects without class prototype methods
 * (e.g. BaseEntity's save/remove), so this ensures type compatibility when spreading.
 */
type PlainShape<T> = {
  [K in keyof T as T[K] extends (...args: any[]) => any ? never : K]: T[K];
};

export interface TeamBuilderPlayer extends PlainShape<Player> {
  survey?: SurveyResponse;
  lowPerformance: boolean;
  lowPresence: boolean;
  performancePercent: number;
  presencePercent: number;
  isNewPlayer: boolean;
  isStopping: boolean;
  levelWarning?: string;
  teamCountWarning?: string;
  assignedTeamId?: string;
  membershipType: 'REGULAR' | 'BACKUP';
}

export interface TeamBuilderTeam extends PlainShape<Team> {
  type: 'M' | 'F' | 'MX';
  isNew: boolean;
  isPromoted: boolean;
  isDemoted: boolean;
  isMarkedForRemoval: boolean;
  standingOutcome: TeamBuilderStandingOutcome;
  standingPosition?: number;
  originalSubEvent?: CompetitionSubEvent;
  originalTeamIndex?: number;
  selectedSubEvent?: CompetitionSubEvent;
  subEventManuallyOverridden: boolean;
  players: TeamBuilderPlayer[];
  teamIndex: number;
  isValid: boolean;
  validationErrors: string[];
}
