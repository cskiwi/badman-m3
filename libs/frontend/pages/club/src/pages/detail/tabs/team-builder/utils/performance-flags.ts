export interface EncounterStats {
  playerId: string;
  teamId: string;
  /** Total encounters for the team this season */
  totalEncounters: number;
  /** Encounters where the player was present (played at least 1 game) */
  playedEncounters: number;
  /** Total individual games played by the player for this team */
  playedGames: number;
  /** Total individual games won by the player for this team */
  wins: number;
  /** Total individual games lost by the player for this team */
  losses: number;
}

export interface PerformanceResult {
  lowPerformance: boolean;
  encounterPresencePercent: number;
}

const LOW_PRESENCE_THRESHOLD = 45;

/**
 * Determine if a player has low performance in their current team.
 *
 * Flags a player if:
 * - Their encounter presence is below 30%
 */
export function evaluatePerformance(stats: EncounterStats | undefined): PerformanceResult {
  if (!stats || stats.playedGames === 0) {
    return { lowPerformance: false, encounterPresencePercent: 0 };
  }

  const presencePercent = Math.round((stats.wins / stats.playedGames) * 100);

  return {
    lowPerformance: presencePercent < LOW_PRESENCE_THRESHOLD,
    encounterPresencePercent: presencePercent,
  };
}
