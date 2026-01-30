export interface TournamentSoftwareResponse<T> {
  Result: {
    Version: string;
  } & T;
}

export interface Tournament {
  Code: string;
  Name: string;
  Number?: string;
  HistoricCode?: string;
  TypeID: TournamentType;
  TournamentStatus: TournamentStatus;
  LastUpdated: string;
  StartDate: string;
  EndDate: string;
  Livescore: boolean;
  OnlineEntryStartDate?: string;
  OnlineEntryEndDate?: string;
  OnlineEntryWithdrawalDeadline?: string;
  TournamentTimezone: number;
  PrizeMoney?: number;
  CountryCode?: string;
  Category?: {
    Code: string;
    Name: string;
  };
  Organization?: {
    ID: string;
    Name: string;
  };
  Contact?: {
    Name: string;
    Phone?: string;
    Email?: string;
  };
  Venue?: {
    Name?: string;
    Address?: string;
    PostalCode?: string;
    City?: string;
    State?: string;
    CountryCode?: string;
    Phone?: string;
    Website?: string;
  };
}

export interface TournamentEvent {
  Code: string;
  Name: string;
  LevelID?: number;
  GenderID: GenderType;
  GameTypeID: GameType;
  ParaClassID: number;
}

export interface Team {
  Code: string;
  Name: string;
  CountryCode: string;
}

export interface Player {
  MemberID: string;
  Firstname: string;
  Lastname: string;
  GenderID: GenderType;
  CountryCode: string;
}

export interface Entry {
  StageEntries: {
    StageEntry: {
      StageCode: string;
      Seed?: number;
    };
  };
  Player1: Player;
  Player2?: Player; // For doubles
}

export interface TournamentDraw {
  Code: string;
  EventCode: string;
  Name: string;
  TypeID: DrawType;
  Size: number;
  Qualification: boolean;
  StageCode: string;
  Position: number;
  Structure: {
    Item: DrawItem[];
  };
}

export interface DrawItem {
  Col: number;
  Row: number;
  Code: string;
  Winner: MatchWinner;
  ScoreStatus: number;
  MatchTime?: string;
  Team?: {
    Code?: string;
    Name?: string;
    CountryCode?: string;
    Player1?: Player;
    Player2?: Player;
  };
  Sets?: {
    Set: MatchSet[];
  };
}

export interface Match {
  Code: string;
  Winner: MatchWinner;
  ScoreStatus: number;
  RoundName?: string;
  MatchTime?: string;
  EventCode: string;
  EventName: string;
  DrawCode: string;
  DrawName: string;
  CourtCode?: string;
  CourtName?: string;
  LocationCode?: string;
  LocationName?: string;
  Team1: {
    Player1: Player;
    Player2?: Player;
  };
  Team2: {
    Player1: Player;
    Player2?: Player;
  };
  Duration?: number;
  Sets: {
    Set: MatchSet[];
  };
}

/**
 * TeamMatch represents a competition encounter between two teams
 * This is different from Match which is for individual/doubles matches
 */
export interface TeamMatch {
  Code: string;
  Winner: MatchWinner;
  ScoreStatus: number;
  RoundName?: string;
  MatchTime?: string;
  EventCode: string;
  EventName: string;
  DrawCode: string;
  DrawName: string;
  Team1: {
    Code: string;
    Name: string;
    CountryCode?: string;
  };
  Team2: {
    Code: string;
    Name: string;
    CountryCode?: string;
  };
  Sets?: {
    Set: MatchSet[] | MatchSet;
  };
}

export interface MatchSet {
  Team1: string;
  Team2: string;
}

export interface Stage {
  Code: string;
  Name: string;
  StartDate?: string;
  EndDate?: string;
}

// Enums based on API documentation and examples
export enum TournamentType {
  Individual = 0,
  Team = 1,
  TeamSport = 2,
  OnlineLeague = 3,
}

export enum TournamentStatus {
  Unknown = 0,
  Finished = 101,
  Cancelled = 199,
  Postponed = 198,
  LeagueNew = 201,
  LeagueEntryOpen = 202,
  LeaguePubliclyVisible = 203,
  LeagueFinished = 204,
}

export enum GenderType {
  Men = 1,
  Women = 2,
  Mixed = 3,
}

export enum GameType {
  Singles = 1,
  Doubles = 2,
}

export enum DrawType {
  Knockout = 0,
  RoundRobin = 3,
}

export enum MatchWinner {
  NotPlayed = 0,
  Team1 = 1,
  Team2 = 2,
}

// API Response Types
export interface TournamentListResponse {
  Result: {
    Version: string;
    Tournament: Tournament[];
  };
}

export interface TournamentDetailsResponse {
  Result: {
    Version: string;
    Tournament: Tournament;
  };
}

export interface TournamentEventsResponse {
  Result: {
    Version: string;
    TournamentEvent: TournamentEvent[];
  };
}

export interface TournamentTeamsResponse {
  Result: {
    Version: string;
    Team: Team[];
  };
}

export interface TournamentEntriesResponse {
  Result: {
    Version: string;
    Entry: Entry[];
  };
}

export interface TournamentDrawResponse {
  Result: {
    Version: string;
    TournamentDraw: TournamentDraw;
  };
}

export interface MatchResponse {
  Result: {
    Version: string;
    Match: Match;
  };
}

export interface MatchesResponse {
  Result: {
    Version: string;
    Match: Match[];
  };
}

export interface StagesResponse {
  Result: {
    Version: string;
    Stage: Stage[];
  };
}

export interface TeamMatchesResponse {
  Result: {
    Version: string;
    TeamMatch: TeamMatch[];
  };
}

export interface TeamMatchResponse {
  Result: {
    Version: string;
    TeamMatch: TeamMatch;
  };
}