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
  /** Whether the player has low performance (win rate below threshold) */
  lowPerformance: boolean;
  /** Whether the player has low presence (attendance below threshold) */
  lowPresence: boolean;
  /** Win rate: wins / games played * 100 */
  performancePercent: number;
  /** Attendance rate: encounters played / total encounters * 100 */
  presencePercent: number;
}

const LOW_PERFORMANCE_THRESHOLD = 35;
const LOW_PRESENCE_THRESHOLD = 40;

/**
 * Determine if a player has low performance or low presence in their current team.
 *
 * - Performance = win rate (wins / games played)
 * - Presence = attendance (encounters present / total encounters)
 */
export function evaluatePerformance(
  stats: EncounterStats | undefined,
  performanceThreshold = LOW_PERFORMANCE_THRESHOLD,
  presenceThreshold = LOW_PRESENCE_THRESHOLD,
): PerformanceResult {
  if (!stats || stats.totalEncounters === 0) {
    return { lowPerformance: false, lowPresence: false, performancePercent: 0, presencePercent: 0 };
  }

  const presencePercent = Math.round((stats.playedEncounters / stats.totalEncounters) * 100);
  const performancePercent = stats.playedGames > 0 ? Math.round((stats.wins / stats.playedGames) * 100) : 0;

  return {
    lowPerformance: stats.playedGames > 0 && performancePercent < performanceThreshold,
    lowPresence: presencePercent < presenceThreshold,
    performancePercent,
    presencePercent,
  };
}
