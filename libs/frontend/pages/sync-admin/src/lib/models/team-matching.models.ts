export interface TeamMatchingStats {
  totalUnmatchedTeams: number;
  totalMatchedTeams: number;
  pendingReviews: number;
  autoMatchedHighConfidence: number;
  autoMatchedMediumConfidence: number;
  manuallyMatched: number;
}

export interface GetTeamMatchingStatsResponse {
  teamMatchingStats: TeamMatchingStats;
}

export interface UnmatchedTeamsResult {
  items: UnmatchedTeam[];
  total: number;
}

export interface GetUnmatchedTeamsResponse {
  unmatchedTeams: UnmatchedTeamsResult;
}

export interface MatchedTeamsResult {
  items: MatchedTeam[];
  total: number;
}

export interface GetMatchedTeamsResponse {
  matchedTeams: MatchedTeamsResult;
}

export interface UnmatchedTeam {
  id: string;
  externalCode: string;
  externalName: string;
  tournamentCode: string;
  tournamentName: string;
  normalizedName: string;
  clubName: string;
  teamNumber: number;
  gender: string;
  strength: number;
  suggestions: TeamSuggestion[];
  lastReviewedAt: Date;
}

export interface TeamSuggestion {
  teamId: string;
  teamName: string;
  clubName: string;
  score: number;
  teamNumber: number;
  gender: string;
}

export interface MatchedTeam {
  id: string;
  externalCode: string;
  externalName: string;
  matchedTeamId: string;
  matchedTeamName: string;
  matchedClubName: string;
  matchScore: number;
  matchType: string;
  tournamentCode: string;
  tournamentName: string;
  matchedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}