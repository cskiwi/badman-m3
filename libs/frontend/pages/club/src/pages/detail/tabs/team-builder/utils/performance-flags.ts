export interface EncounterStats {
  playerId: string;
  teamId: string;
  totalEncounters: number;
  playedEncounters: number;
  wins: number;
  losses: number;
}

export interface PerformanceResult {
  lowPerformance: boolean;
  encounterPresencePercent: number;
}

const LOW_PRESENCE_THRESHOLD = 30;

/**
 * Determine if a player has low performance in their current team.
 *
 * Flags a player if:
 * - Their encounter presence is below 30%
 */
export function evaluatePerformance(stats: EncounterStats | undefined): PerformanceResult {
  if (!stats || stats.totalEncounters === 0) {
    return { lowPerformance: false, encounterPresencePercent: 0 };
  }

  const presencePercent = Math.round((stats.playedEncounters / stats.totalEncounters) * 100);

  return {
    lowPerformance: presencePercent < LOW_PRESENCE_THRESHOLD,
    encounterPresencePercent: presencePercent,
  };
}
