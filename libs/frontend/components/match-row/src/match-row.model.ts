export interface MatchPlayer {
  name: string;
  level?: number;
  isOwn?: boolean;
}

export interface MatchPair {
  players: MatchPlayer[];
}

export interface MatchScore {
  home: number;
  away: number;
}

export interface MatchRowData {
  league: string;
  competition: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homePair: MatchPair;
  awayPair: MatchPair;
  scores: MatchScore[];
  outcome: 'win' | 'loss' | 'pending';
  pointsDelta?: string;
  pointsLabel?: string;
}
