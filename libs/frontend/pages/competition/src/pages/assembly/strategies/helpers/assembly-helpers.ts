import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../../page-assembly.service';
import { OccupiedSlots, SlotAssignment } from '../assembly-strategy.types';
import { getTargetMaxGames } from './game-distribution.helpers';

export function rankingSum(player: PlayerWithRanking, type: string): number {
  const r = player.rankingLastPlaces?.[0];
  return (r?.single ?? 12) + (r?.double ?? 12) + (type === SubEventTypeEnum.MX ? (r?.mix ?? 12) : 0);
}

export function pairKey(id1: string, id2: string): string {
  return [id1, id2].sort().join(':');
}

export function orderDoublePair(
  p1: PlayerWithRanking,
  p2: PlayerWithRanking,
  rankType: 'double' | 'mix',
): [PlayerWithRanking, PlayerWithRanking] {
  const r1 = p1.rankingLastPlaces?.[0]?.[rankType] ?? 12;
  const r2 = p2.rankingLastPlaces?.[0]?.[rankType] ?? 12;
  return r1 <= r2 ? [p1, p2] : [p2, p1];
}

export function doublePairSum(pair: [PlayerWithRanking, PlayerWithRanking], rankType: 'double' | 'mix'): number {
  return (pair[0].rankingLastPlaces?.[0]?.[rankType] ?? 12) + (pair[1].rankingLastPlaces?.[0]?.[rankType] ?? 12);
}

export function getUsedPlayerIds(assignment: SlotAssignment, gender?: string): string[] {
  const ids: string[] = [];
  for (const slot of ['double1', 'double2', 'double3', 'double4'] as const) {
    const pair = assignment[slot];
    if (pair) {
      for (const p of pair) {
        if (!gender || p.gender === gender) ids.push(p.id);
      }
    }
  }
  return ids;
}

export function getUsedSingleIds(assignment: SlotAssignment, occupied?: OccupiedSlots): string[] {
  const ids: string[] = [];
  // Include players from pre-assigned occupied single slots
  if (occupied?.preAssignedSingleIds) {
    for (const id of occupied.preAssignedSingleIds) {
      ids.push(id);
    }
  }
  for (const slot of ['single1', 'single2', 'single3', 'single4'] as const) {
    const p = assignment[slot];
    if (p) ids.push(p.id);
  }
  return ids;
}

export function countPlayerInDoubles(assignment: SlotAssignment, playerId: string, existingDoubles?: PlayerWithRanking[][]): number {
  let count = 0;
  for (const slot of ['double1', 'double2', 'double3', 'double4'] as const) {
    const pair = assignment[slot];
    if (pair?.some((p) => p.id === playerId)) count++;
  }
  if (existingDoubles) {
    for (const data of existingDoubles) {
      if (data.some((p) => p.id === playerId)) count++;
    }
  }
  return count;
}

export function countCombinations(assemblies: Record<string, unknown>[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const assembly of assemblies) {
    for (const slot of ['double1', 'double2', 'double3', 'double4']) {
      const ids = assembly[slot] as string[] | undefined;
      if (ids?.length === 2) {
        const key = pairKey(ids[0], ids[1]);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    for (const slot of ['single1', 'single2', 'single3', 'single4']) {
      const id = assembly[slot] as string | undefined;
      if (id) {
        const key = `single:${id}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export function countSingleAppearances(playerIds: string[], counts: Map<string, number>): Map<string, number> {
  const result = new Map<string, number>();
  for (const id of playerIds) {
    result.set(id, counts.get(`single:${id}`) ?? 0);
  }
  return result;
}

export function getLeastUsedPair(
  group1: PlayerWithRanking[],
  group2: PlayerWithRanking[],
  counts: Map<string, number>,
  excludePairs?: Set<string>,
  gameCountFn?: (id: string) => number,
): [PlayerWithRanking, PlayerWithRanking] | null {
  let bestPair: [PlayerWithRanking, PlayerWithRanking] | null = null;
  let bestCount = Infinity;
  let bestGameSum = Infinity;

  for (const p1 of group1) {
    for (const p2 of group2) {
      if (p1.id === p2.id) continue;
      const key = pairKey(p1.id, p2.id);
      if (excludePairs?.has(key)) continue;
      const count = counts.get(key) ?? 0;
      const gameSum = gameCountFn ? gameCountFn(p1.id) + gameCountFn(p2.id) : 0;
      if (count < bestCount || (count === bestCount && gameSum < bestGameSum)) {
        bestCount = count;
        bestGameSum = gameSum;
        bestPair = [p1, p2];
      }
    }
  }

  return bestPair;
}

export function scorePairs(games: { player1Id: string; player2Id?: string; won: boolean }[], players: PlayerWithRanking[]): Map<string, { wins: number; total: number }> {
  const scores = new Map<string, { wins: number; total: number }>();
  const playerIds = new Set(players.map((p) => p.id));

  for (const game of games) {
    if (!game.player1Id || !playerIds.has(game.player1Id)) continue;

    if (game.player2Id && playerIds.has(game.player2Id)) {
      const key = pairKey(game.player1Id, game.player2Id);
      const existing = scores.get(key) ?? { wins: 0, total: 0 };
      existing.total++;
      if (game.won) existing.wins++;
      scores.set(key, existing);
    }
  }

  return scores;
}

export function getBestScoredPair(
  group1: PlayerWithRanking[],
  group2: PlayerWithRanking[],
  scores: Map<string, { wins: number; total: number }>,
  excludePairs?: Set<string>,
  gameCountFn?: (id: string) => number,
): [PlayerWithRanking, PlayerWithRanking] | null {
  let bestPair: [PlayerWithRanking, PlayerWithRanking] | null = null;
  let bestScore = -1;
  let bestGameSum = Infinity;

  for (const p1 of group1) {
    for (const p2 of group2) {
      if (p1.id === p2.id) continue;
      const key = pairKey(p1.id, p2.id);
      if (excludePairs?.has(key)) continue;
      const stat = scores.get(key);
      const score = stat ? stat.wins / stat.total : 0;
      const gameSum = gameCountFn ? gameCountFn(p1.id) + gameCountFn(p2.id) : 0;
      if (score > bestScore || (score === bestScore && gameSum < bestGameSum)) {
        bestScore = score;
        bestGameSum = gameSum;
        bestPair = [p1, p2];
      }
    }
  }

  if (!bestPair && group1.length > 0 && group2.length > 0) {
    for (const p1 of group1) {
      for (const p2 of group2) {
        if (p1.id !== p2.id) {
          const key = pairKey(p1.id, p2.id);
          if (!excludePairs?.has(key)) return [p1, p2];
        }
      }
    }
  }

  return bestPair;
}

export function ensureSingleOrder(assignment: SlotAssignment, key1: 'single1' | 'single2' | 'single3' | 'single4', key2: 'single1' | 'single2' | 'single3' | 'single4') {
  if (assignment[key1] && assignment[key2]) {
    const r1 = assignment[key1]!.rankingLastPlaces?.[0]?.single ?? 12;
    const r2 = assignment[key2]!.rankingLastPlaces?.[0]?.single ?? 12;
    if (r2 < r1) {
      const temp = assignment[key1];
      assignment[key1] = assignment[key2];
      assignment[key2] = temp;
    }
  }
}

export function ensureDoubleOrder(assignment: SlotAssignment, key1: 'double1' | 'double2' | 'double3' | 'double4', key2: 'double1' | 'double2' | 'double3' | 'double4', rankType: 'double' | 'mix' = 'double') {
  if (assignment[key1] && assignment[key2]) {
    const sum1 = doublePairSum(assignment[key1]!, rankType);
    const sum2 = doublePairSum(assignment[key2]!, rankType);
    if (sum2 < sum1 || (sum2 === sum1 && Math.min(
      assignment[key2]![0].rankingLastPlaces?.[0]?.[rankType] ?? 12,
      assignment[key2]![1].rankingLastPlaces?.[0]?.[rankType] ?? 12,
    ) < Math.min(
      assignment[key1]![0].rankingLastPlaces?.[0]?.[rankType] ?? 12,
      assignment[key1]![1].rankingLastPlaces?.[0]?.[rankType] ?? 12,
    ))) {
      const temp = assignment[key1];
      assignment[key1] = assignment[key2];
      assignment[key2] = temp;
    }
  }
}

/**
 * Sort all 4 singles in order for non-MX types (single1 <= single2 <= single3 <= single4)
 */
export function ensureAllSinglesOrder(assignment: SlotAssignment) {
  const keys: ('single1' | 'single2' | 'single3' | 'single4')[] = ['single1', 'single2', 'single3', 'single4'];
  const entries = keys
    .filter((k) => assignment[k] != null)
    .map((k) => ({ key: k, player: assignment[k]! }));

  entries.sort((a, b) => {
    const ra = a.player.rankingLastPlaces?.[0]?.single ?? 12;
    const rb = b.player.rankingLastPlaces?.[0]?.single ?? 12;
    return ra - rb;
  });

  // Re-assign sorted players to their original slot positions
  const filledKeys = keys.filter((k) => assignment[k] != null);
  for (let i = 0; i < filledKeys.length; i++) {
    assignment[filledKeys[i]] = entries[i].player;
  }
}

/**
 * Sort all 4 doubles in order for non-MX types (double1 <= double2 <= double3 <= double4)
 */
export function ensureAllDoublesOrder(assignment: SlotAssignment, rankType: 'double' | 'mix' = 'double') {
  const keys: ('double1' | 'double2' | 'double3' | 'double4')[] = ['double1', 'double2', 'double3', 'double4'];
  const entries = keys
    .filter((k) => assignment[k] != null)
    .map((k) => ({ key: k, pair: assignment[k]! }));

  entries.sort((a, b) => {
    const sumA = doublePairSum(a.pair, rankType);
    const sumB = doublePairSum(b.pair, rankType);
    if (sumA !== sumB) return sumA - sumB;
    // Tiebreak: pair with stronger individual player goes first
    const minA = Math.min(a.pair[0].rankingLastPlaces?.[0]?.[rankType] ?? 12, a.pair[1].rankingLastPlaces?.[0]?.[rankType] ?? 12);
    const minB = Math.min(b.pair[0].rankingLastPlaces?.[0]?.[rankType] ?? 12, b.pair[1].rankingLastPlaces?.[0]?.[rankType] ?? 12);
    return minA - minB;
  });

  const filledKeys = keys.filter((k) => assignment[k] != null);
  for (let i = 0; i < filledKeys.length; i++) {
    assignment[filledKeys[i]] = entries[i].pair;
  }
}

/**
 * Get all player IDs that appear in the current assignment (singles + doubles)
 */
export function getAllAssignedPlayerIds(assignment: SlotAssignment): Set<string> {
  const ids = new Set<string>();
  for (const slot of ['single1', 'single2', 'single3', 'single4'] as const) {
    if (assignment[slot]) ids.add(assignment[slot]!.id);
  }
  for (const slot of ['double1', 'double2', 'double3', 'double4'] as const) {
    if (assignment[slot]) {
      for (const p of assignment[slot]!) ids.add(p.id);
    }
  }
  return ids;
}

/**
 * Count how many games a player has been assigned in the current assignment
 * plus any pre-assigned games from occupied slots
 */
export function countPlayerGames(assignment: SlotAssignment, playerId: string, preAssignedCounts?: Map<string, number>): number {
  let count = preAssignedCounts?.get(playerId) ?? 0;
  for (const slot of ['single1', 'single2', 'single3', 'single4'] as const) {
    if (assignment[slot]?.id === playerId) count++;
  }
  for (const slot of ['double1', 'double2', 'double3', 'double4'] as const) {
    if (assignment[slot]?.some((p) => p.id === playerId)) count++;
  }
  return count;
}

/**
 * Check if a player is already assigned to a single slot (including pre-assigned occupied slots)
 */
function isInSingles(assignment: SlotAssignment, playerId: string, occupied?: OccupiedSlots): boolean {
  // Check pre-assigned singles from occupied slots
  if (occupied?.preAssignedSingleIds?.has(playerId)) return true;
  for (const slot of ['single1', 'single2', 'single3', 'single4'] as const) {
    if (assignment[slot]?.id === playerId) return true;
  }
  return false;
}

/**
 * Count how many doubles a player is in (assignment + existing slots)
 */
function countDoublesForPlayer(assignment: SlotAssignment, playerId: string, existingDoubles: PlayerWithRanking[][]): number {
  let count = 0;
  for (const slot of ['double1', 'double2', 'double3', 'double4'] as const) {
    if (assignment[slot]?.some((p) => p.id === playerId)) count++;
  }
  for (const data of existingDoubles) {
    if (data.some((p) => p.id === playerId)) count++;
  }
  return count;
}

/**
 * Count how many mixed doubles (double3/double4) a player is in
 */
export function countMixedDoublesForPlayer(
  assignment: SlotAssignment,
  playerId: string,
): number {
  let count = 0;
  for (const slot of ['double3', 'double4'] as const) {
    if (assignment[slot]?.some((p) => p.id === playerId)) count++;
  }
  return count;
}

/**
 * Get pair keys for all doubles currently in the assignment
 */
export function getExistingPairKeys(assignment: SlotAssignment): Set<string> {
  const keys = new Set<string>();
  for (const slot of ['double1', 'double2', 'double3', 'double4'] as const) {
    if (assignment[slot]) {
      keys.add(pairKey(assignment[slot]![0].id, assignment[slot]![1].id));
    }
  }
  return keys;
}

/**
 * Find a partner for a pre-assigned player in a partial double slot.
 * Returns the best available partner from the candidate pool.
 */
export function findPartnerFor(
  player: PlayerWithRanking,
  candidates: PlayerWithRanking[],
  assignment: SlotAssignment,
  existingDoubles: PlayerWithRanking[][],
  maxGames: number,
  preAssignedCounts?: Map<string, number>,
): PlayerWithRanking | null {
  return candidates
    .filter((p) => p.id !== player.id)
    .filter((p) => countDoublesForPlayer(assignment, p.id, existingDoubles) < 2)
    .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames)
    .sort((a, b) =>
      countPlayerGames(assignment, a.id, preAssignedCounts) -
      countPlayerGames(assignment, b.id, preAssignedCounts),
    )[0] ?? null;
}

/**
 * Find the best pair from candidates that hasn't already been used in the assignment.
 * Candidates are sorted by game count. Tries all unique pairs from the sorted list.
 */
function findUnusedPair(
  candidates: PlayerWithRanking[],
  existingPairs: Set<string>,
): [PlayerWithRanking, PlayerWithRanking] | null {
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const key = pairKey(candidates[i].id, candidates[j].id);
      if (!existingPairs.has(key)) {
        return [candidates[i], candidates[j]];
      }
    }
  }
  // If all pairs are used (rare), fall back to first available
  if (candidates.length >= 2) {
    return [candidates[0], candidates[1]];
  }
  return null;
}

/**
 * Find the best mixed pair (one from each group) that hasn't been used.
 */
function findUnusedMixedPair(
  group1: PlayerWithRanking[],
  group2: PlayerWithRanking[],
  existingPairs: Set<string>,
): [PlayerWithRanking, PlayerWithRanking] | null {
  for (const p1 of group1) {
    for (const p2 of group2) {
      const key = pairKey(p1.id, p2.id);
      if (!existingPairs.has(key)) {
        return [p1, p2];
      }
    }
  }
  // Fallback
  if (group1.length >= 1 && group2.length >= 1) {
    return [group1[0], group2[0]];
  }
  return null;
}

/**
 * Fill all empty slots ensuring every available player participates.
 * Distribution rules:
 * - 4 players: 3 games each (2 doubles + 1 single)
 * - 5 players: 2 play 3 games, 3 play 2 games
 * - 6 players: 2 games each
 *
 * Constraints: max 2 doubles, max 1 single per player
 */
export function fillAllSlots(
  assignment: SlotAssignment,
  players: PlayerWithRanking[],
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
) {
  const maxGames = getTargetMaxGames(players.length);

  // Fill empty double slots first
  const doubleSlots: ('double1' | 'double2' | 'double3' | 'double4')[] = ['double1', 'double2', 'double3', 'double4'];
  for (const slot of doubleSlots) {
    if (occupied[slot] || assignment[slot]) continue;

    // Handle partial double: find a partner for the pre-assigned player
    const partial = occupied.partialDoubles.get(slot) as PlayerWithRanking | undefined;
    if (partial) {
      const candidates = players
        .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames);
      const partner = findPartnerFor(partial, candidates, assignment, existingDoubles, maxGames, preAssignedCounts);
      if (partner) assignment[slot] = orderDoublePair(partial, partner, 'double');
      continue;
    }

    const existingPairs = getExistingPairKeys(assignment);
    const candidates = players
      .filter((p) => countDoublesForPlayer(assignment, p.id, existingDoubles) < 2)
      .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames)
      .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));

    const pair = findUnusedPair(candidates, existingPairs);
    if (pair) {
      assignment[slot] = orderDoublePair(pair[0], pair[1], 'double');
    }
  }

  // Fill empty single slots
  const singleSlots: ('single1' | 'single2' | 'single3' | 'single4')[] = ['single1', 'single2', 'single3', 'single4'];
  for (const slot of singleSlots) {
    if (occupied[slot] || assignment[slot]) continue;

    const candidate = players
      .filter((p) => !isInSingles(assignment, p.id, occupied))
      .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames)
      .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts))[0];

    if (candidate) {
      assignment[slot] = candidate;
    }
  }
}

/**
 * MX-specific slot filling: respects gender constraints for each slot type.
 * MD = double1 (M+M), FD = double2 (F+F), MXD1 = double3 (M+F), MXD2 = double4 (M+F)
 * MS1/MS2 = single1/single2, FS1/FS2 = single3/single4
 */
export function fillAllSlotsMX(
  assignment: SlotAssignment,
  males: PlayerWithRanking[],
  females: PlayerWithRanking[],
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
) {
  const maxGamesM = getTargetMaxGames(males.length, 6);
  const maxGamesF = getTargetMaxGames(females.length, 6);

  // MD (double1) - male pair
  if (!occupied.double1 && !assignment.double1) {
    const partial = occupied.partialDoubles.get('double1') as PlayerWithRanking | undefined;
    if (partial) {
      const candidates = males.filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM);
      const partner = findPartnerFor(partial, candidates, assignment, existingDoubles, maxGamesM, preAssignedCounts);
      if (partner) assignment.double1 = orderDoublePair(partial, partner, 'double');
    } else {
      const existingPairs = getExistingPairKeys(assignment);
      const candidates = males
        .filter((m) => countDoublesForPlayer(assignment, m.id, existingDoubles) < 2)
        .filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM)
        .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const pair = findUnusedPair(candidates, existingPairs);
      if (pair) {
        assignment.double1 = orderDoublePair(pair[0], pair[1], 'double');
      }
    }
  }

  // FD (double2) - female pair
  if (!occupied.double2 && !assignment.double2) {
    const partial = occupied.partialDoubles.get('double2') as PlayerWithRanking | undefined;
    if (partial) {
      const candidates = females.filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF);
      const partner = findPartnerFor(partial, candidates, assignment, existingDoubles, maxGamesF, preAssignedCounts);
      if (partner) assignment.double2 = orderDoublePair(partial, partner, 'double');
    } else {
      const existingPairs = getExistingPairKeys(assignment);
      const candidates = females
        .filter((f) => countDoublesForPlayer(assignment, f.id, existingDoubles) < 2)
        .filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF)
        .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const pair = findUnusedPair(candidates, existingPairs);
      if (pair) {
        assignment.double2 = orderDoublePair(pair[0], pair[1], 'double');
      }
    }
  }

  // MXD1 (double3) - mixed pair
  if (!occupied.double3 && !assignment.double3) {
    const partial = occupied.partialDoubles.get('double3') as PlayerWithRanking | undefined;
    if (partial) {
      const pool = partial.gender === 'M' ? females : males;
      const maxG = partial.gender === 'M' ? maxGamesF : maxGamesM;
      const avail = pool.filter((p) => countMixedDoublesForPlayer(assignment, p.id) < 1);
      const partner = findPartnerFor(partial, avail, assignment, existingDoubles, maxG, preAssignedCounts);
      if (partner) assignment.double3 = [partial, partner];
    } else {
      const existingPairs = getExistingPairKeys(assignment);
      const mCandidates = males
        .filter((m) => countDoublesForPlayer(assignment, m.id, existingDoubles) < 2)
        .filter((m) => countMixedDoublesForPlayer(assignment, m.id) < 1)
        .filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM)
        .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const fCandidates = females
        .filter((f) => countDoublesForPlayer(assignment, f.id, existingDoubles) < 2)
        .filter((f) => countMixedDoublesForPlayer(assignment, f.id) < 1)
        .filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF)
        .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const pair = findUnusedMixedPair(mCandidates, fCandidates, existingPairs);
      if (pair) {
        assignment.double3 = [pair[0], pair[1]];
      }
    }
  }

  // MXD2 (double4) - mixed pair
  if (!occupied.double4 && !assignment.double4) {
    const partial = occupied.partialDoubles.get('double4') as PlayerWithRanking | undefined;
    if (partial) {
      const pool = partial.gender === 'M' ? females : males;
      const maxG = partial.gender === 'M' ? maxGamesF : maxGamesM;
      const avail = pool.filter((p) => countMixedDoublesForPlayer(assignment, p.id) < 1);
      const partner = findPartnerFor(partial, avail, assignment, existingDoubles, maxG, preAssignedCounts);
      if (partner) assignment.double4 = [partial, partner];
    } else {
      const existingPairs = getExistingPairKeys(assignment);
      const mCandidates = males
        .filter((m) => countDoublesForPlayer(assignment, m.id, existingDoubles) < 2)
        .filter((m) => countMixedDoublesForPlayer(assignment, m.id) < 1)
        .filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM)
        .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const fCandidates = females
        .filter((f) => countDoublesForPlayer(assignment, f.id, existingDoubles) < 2)
        .filter((f) => countMixedDoublesForPlayer(assignment, f.id) < 1)
        .filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF)
        .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const pair = findUnusedMixedPair(mCandidates, fCandidates, existingPairs);
      if (pair) {
        assignment.double4 = [pair[0], pair[1]];
      }
    }
  }

  // MS1 (single1)
  if (!occupied.single1 && !assignment.single1) {
    const candidate = males
      .filter((m) => !isInSingles(assignment, m.id, occupied))
      .filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM)
      .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts))[0];
    if (candidate) assignment.single1 = candidate;
  }

  // MS2 (single2)
  if (!occupied.single2 && !assignment.single2) {
    const candidate = males
      .filter((m) => !isInSingles(assignment, m.id, occupied))
      .filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM)
      .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts))[0];
    if (candidate) assignment.single2 = candidate;
  }

  // FS1 (single3)
  if (!occupied.single3 && !assignment.single3) {
    const candidate = females
      .filter((f) => !isInSingles(assignment, f.id, occupied))
      .filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF)
      .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts))[0];
    if (candidate) assignment.single3 = candidate;
  }

  // FS2 (single4)
  if (!occupied.single4 && !assignment.single4) {
    const candidate = females
      .filter((f) => !isInSingles(assignment, f.id, occupied))
      .filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF)
      .sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts))[0];
    if (candidate) assignment.single4 = candidate;
  }
}
