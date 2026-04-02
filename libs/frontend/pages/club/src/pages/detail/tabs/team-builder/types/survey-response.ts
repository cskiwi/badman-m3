export interface SurveyResponse {
  // Identifiers
  externalId: string;
  createdOn: string;
  createdBy: string;
  fullName: string;
  firstName: string;
  lastName: string;

  // Current situation
  currentTeams: string[];

  // Preferences
  desiredTeamCount: number;
  preferredPlayDay: string;
  team1Choice1: string;
  team1Choice2: string;
  team2Choice1: string;
  team2Choice2: string;

  // Availability
  canMeet75PercentTeam1: string;
  unavailabilityPeriodsTeam1: string;
  canMeet75PercentTeam2: string;
  unavailabilityPeriodsTeam2: string;

  // Other
  comments: string;
  meetingAttendance: string;
  availableDates: string[];

  // Stopping competition
  stoppingCompetition: boolean;

  // Linked player (resolved after import via search API)
  linkedContactIds: string[];
  matchedPlayerId?: string;
  matchedPlayerName?: string;
  matchConfidence?: 'high' | 'medium' | 'low' | 'none';
}
