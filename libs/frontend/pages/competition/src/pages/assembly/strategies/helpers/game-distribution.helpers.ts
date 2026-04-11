import { PlayerWithRanking } from '../../page-assembly.service';

export interface PlayerGameBudget {
  player: PlayerWithRanking;
  /** Total games this player should play this encounter */
  targetGames: number;
  /** Games already pre-assigned to this player */
  preAssignedGames: number;
  /** How many more games the strategy needs to assign: targetGames - preAssignedGames */
  remainingGames: number;
}

export interface GameDistributionResult {
  /** Maximum games any player will play */
  maxGames: number;
  /** Minimum games any player will play (equals maxGames when pool divides evenly) */
  minGames: number;
  /** Per-player game budgets keyed by playerId */
  budgets: Map<string, PlayerGameBudget>;
  /** Players sorted by assignment priority — least historical games first, random tie-break */
  prioritizedPlayers: PlayerWithRanking[];
}

/**
 * Calculate the target max games per player based on pool size and total available slots.
 * For same-gender encounters: totalSlots=12 (4 doubles × 2 + 4 singles)
 * For MX encounters per gender: totalSlots=6 (gender-specific slots only)
 */
export function getTargetMaxGames(poolSize: number, totalSlots = 12): number {
  if (poolSize <= 0) return 0;
  return Math.ceil(totalSlots / poolSize);
}

/**
 * Calculate how many games each player should play this encounter.
 *
 * Same-gender (12 total player-slots):
 * - 4 players → 3 games each
 * - 5 players → 2 play 3 games, 3 play 2 games
 * - 6 players → 2 games each
 *
 * MX per gender (6 total player-slots):
 * - 2 players → 3 games each
 * - 3 players → 2 games each
 *
 * Players who played the most historically get fewer games (minGames).
 * Pre-assigned slots count toward the player's game total.
 */
export function calculateGameDistribution(
  players: PlayerWithRanking[],
  totalSlots: number,
  preAssignedCounts?: Map<string, number>,
  historicalGameCounts?: Map<string, number>,
): GameDistributionResult {
  const poolSize = players.length;
  if (poolSize === 0) {
    return { maxGames: 0, minGames: 0, budgets: new Map(), prioritizedPlayers: [] };
  }

  const maxGames = Math.ceil(totalSlots / poolSize);
  const minGames = Math.floor(totalSlots / poolSize);
  const remainder = totalSlots % poolSize;
  // How many players get maxGames (rest get minGames)
  const playersWithMax = remainder === 0 ? poolSize : remainder;

  // Sort: least historical games first → they get priority for more games
  // Random tie-break for equal history
  const sorted = [...players].sort((a, b) => {
    const histA = historicalGameCounts?.get(a.id) ?? 0;
    const histB = historicalGameCounts?.get(b.id) ?? 0;
    if (histA !== histB) return histA - histB;
    return Math.random() - 0.5;
  });

  const budgets = new Map<string, PlayerGameBudget>();
  for (let i = 0; i < sorted.length; i++) {
    const player = sorted[i];
    const targetGames = i < playersWithMax ? maxGames : minGames;
    const preAssigned = preAssignedCounts?.get(player.id) ?? 0;
    budgets.set(player.id, {
      player,
      targetGames,
      preAssignedGames: preAssigned,
      remainingGames: Math.max(0, targetGames - preAssigned),
    });
  }

  return {
    maxGames,
    minGames,
    budgets,
    prioritizedPlayers: sorted,
  };
}

/**
 * Count total game appearances per player from historical assemblies.
 * Counts both singles and doubles slot appearances.
 */
export function countHistoricalGames(assemblies: Record<string, unknown>[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const assembly of assemblies) {
    for (const slot of ['double1', 'double2', 'double3', 'double4']) {
      const ids = assembly[slot] as string[] | undefined;
      if (ids) {
        for (const id of ids) {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
    }
    for (const slot of ['single1', 'single2', 'single3', 'single4']) {
      const id = assembly[slot] as string | undefined;
      if (id) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }

  return counts;
}
