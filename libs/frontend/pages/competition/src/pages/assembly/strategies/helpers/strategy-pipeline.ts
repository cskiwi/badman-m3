import { PlayerWithRanking } from '../../page-assembly.service';
import { OccupiedSlots, SlotAssignment } from '../assembly-strategy.types';
import {
  countMixedDoublesForPlayer,
  countPlayerGames,
  doublePairSum,
  ensureAllSinglesOrder,
  ensureDoubleOrder,
  ensureSingleOrder,
  fillAllSlots,
  fillAllSlotsMX,
  findPartnerFor,
  orderDoublePair,
} from './assembly-helpers';
import { GameDistributionResult } from './game-distribution.helpers';

// ---------------------------------------------------------------------------
// Callback types — each strategy provides its own implementations
// ---------------------------------------------------------------------------

/** Generate `count` doubles pairs from a same-gender pool. */
export type PairGeneratorFn = (
  pool: PlayerWithRanking[],
  count: number,
  assignment: SlotAssignment,
  distribution: GameDistributionResult,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
) => [PlayerWithRanking, PlayerWithRanking][];

/** Generate `count` mixed-doubles pairs (one male + one female each). */
export type MixedPairGeneratorFn = (
  males: PlayerWithRanking[],
  females: PlayerWithRanking[],
  count: number,
  assignment: SlotAssignment,
  maleDistribution: GameDistributionResult,
  femaleDistribution: GameDistributionResult,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
) => [PlayerWithRanking, PlayerWithRanking][];

/** Assign one player to a single slot. */
export type SingleAssignerFn = (
  assignment: SlotAssignment,
  slotKey: 'single1' | 'single2' | 'single3' | 'single4',
  pool: PlayerWithRanking[],
  occupied: OccupiedSlots,
  maxGamesFn: (id: string) => number,
  preAssignedCounts?: Map<string, number>,
) => void;

// ---------------------------------------------------------------------------
// Shared: sort pairs by ranking
// ---------------------------------------------------------------------------

/**
 * Sort pairs by ranking sum (ascending = strongest pair first).
 * Tiebreak: best individual ranking in pair, then random.
 */
export function sortPairsByRanking(
  pairs: [PlayerWithRanking, PlayerWithRanking][],
  rankType: 'double' | 'mix' = 'double',
): [PlayerWithRanking, PlayerWithRanking][] {
  return [...pairs].sort((a, b) => {
    const sumA = doublePairSum(a, rankType);
    const sumB = doublePairSum(b, rankType);
    if (sumA !== sumB) return sumA - sumB;
    const minA = Math.min(
      a[0].rankingLastPlaces?.[0]?.[rankType] ?? 12,
      a[1].rankingLastPlaces?.[0]?.[rankType] ?? 12,
    );
    const minB = Math.min(
      b[0].rankingLastPlaces?.[0]?.[rankType] ?? 12,
      b[1].rankingLastPlaces?.[0]?.[rankType] ?? 12,
    );
    if (minA !== minB) return minA - minB;
    return Math.random() - 0.5;
  });
}

// ---------------------------------------------------------------------------
// Same-gender pipeline
// ---------------------------------------------------------------------------

/**
 * Shared 4-step pipeline for same-gender assembly:
 *  1. Distribution  (computed by caller, passed as `distribution`)
 *  2. Make couples   (strategy-specific `generatePairs`)
 *  3. Sort by ranking (shared)
 *  4. Assign to slots (shared)
 */
export function executeSameGenderPipeline(
  pool: PlayerWithRanking[],
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  distribution: GameDistributionResult,
  generatePairs: PairGeneratorFn,
  assignSingle: SingleAssignerFn,
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const assignment: SlotAssignment = {};
  const maxGamesFn = (id: string) =>
    distribution.budgets.get(id)?.targetGames ?? distribution.maxGames;

  const doubleSlots = ['double1', 'double2', 'double3', 'double4'] as const;

  // Pre-step: handle partial doubles (one player already placed by the user)
  for (const slot of doubleSlots) {
    if (occupied[slot]) continue;
    const partial = occupied.partialDoubles.get(slot) as PlayerWithRanking | undefined;
    if (!partial) continue;
    const available = pool.filter(
      (p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGamesFn(p.id),
    );
    const partner = findPartnerFor(
      partial, available, assignment, existingDoubles,
      distribution.maxGames, preAssignedCounts,
    );
    if (partner) assignment[slot] = orderDoublePair(partial, partner, 'double');
  }

  // Step 2: generate pairs (strategy-specific)
  const emptyDoubleSlots = doubleSlots.filter((s) => !occupied[s] && !assignment[s]);
  const pairs = generatePairs(
    pool, emptyDoubleSlots.length, assignment, distribution, existingDoubles, preAssignedCounts,
  );

  // Step 3: sort by ranking
  const sortedPairs = sortPairsByRanking(pairs, 'double');

  // Step 4: assign sorted pairs to double slots (1 → 4)
  for (let i = 0; i < emptyDoubleSlots.length && i < sortedPairs.length; i++) {
    assignment[emptyDoubleSlots[i]] = orderDoublePair(
      sortedPairs[i][0], sortedPairs[i][1], 'double',
    );
  }

  // Singles (strategy-specific)
  const singleSlots = ['single1', 'single2', 'single3', 'single4'] as const;
  for (const slot of singleSlots) {
    assignSingle(assignment, slot, pool, occupied, maxGamesFn, preAssignedCounts);
  }

  // Safety net + ordering
  fillAllSlots(assignment, pool, occupied, existingDoubles, preAssignedCounts);
  ensureAllSinglesOrder(assignment);

  return assignment;
}

// ---------------------------------------------------------------------------
// MX pipeline
// ---------------------------------------------------------------------------

/**
 * Shared 4-step pipeline for mixed assembly:
 *  1. Distribution  (computed by caller for each gender)
 *  2. Make couples   (MD via `generatePairs`, MXD via `generateMixedPairs`)
 *  3. Sort MXD by mix ranking (shared)
 *  4. Assign to slots (shared)
 */
export function executeMXPipeline(
  males: PlayerWithRanking[],
  females: PlayerWithRanking[],
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  maleDistribution: GameDistributionResult,
  femaleDistribution: GameDistributionResult,
  generatePairs: PairGeneratorFn,
  generateMixedPairs: MixedPairGeneratorFn,
  assignSingle: SingleAssignerFn,
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const assignment: SlotAssignment = {};
  const maleMaxGames = (id: string) =>
    maleDistribution.budgets.get(id)?.targetGames ?? maleDistribution.maxGames;
  const femaleMaxGames = (id: string) =>
    femaleDistribution.budgets.get(id)?.targetGames ?? femaleDistribution.maxGames;

  // --- MD (double1): one male pair ---
  if (!occupied.double1) {
    const partial = occupied.partialDoubles.get('double1') as PlayerWithRanking | undefined;
    if (partial) {
      const avail = males.filter(
        (m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maleMaxGames(m.id),
      );
      const partner = findPartnerFor(
        partial, avail, assignment, existingDoubles,
        maleDistribution.maxGames, preAssignedCounts,
      );
      if (partner) assignment.double1 = orderDoublePair(partial, partner, 'double');
    } else {
      const pairs = generatePairs(
        males, 1, assignment, maleDistribution, existingDoubles, preAssignedCounts,
      );
      if (pairs.length > 0) {
        assignment.double1 = orderDoublePair(pairs[0][0], pairs[0][1], 'double');
      }
    }
  }

  // --- FD (double2): one female pair ---
  if (!occupied.double2) {
    const partial = occupied.partialDoubles.get('double2') as PlayerWithRanking | undefined;
    if (partial) {
      const avail = females.filter(
        (f) => countPlayerGames(assignment, f.id, preAssignedCounts) < femaleMaxGames(f.id),
      );
      const partner = findPartnerFor(
        partial, avail, assignment, existingDoubles,
        femaleDistribution.maxGames, preAssignedCounts,
      );
      if (partner) assignment.double2 = orderDoublePair(partial, partner, 'double');
    } else {
      const pairs = generatePairs(
        females, 1, assignment, femaleDistribution, existingDoubles, preAssignedCounts,
      );
      if (pairs.length > 0) {
        assignment.double2 = orderDoublePair(pairs[0][0], pairs[0][1], 'double');
      }
    }
  }

  // --- MXD (double3, double4): mixed doubles ---
  const mxdSlots: ('double3' | 'double4')[] = ['double3', 'double4'];
  const emptyMxdSlots = mxdSlots.filter((s) => !occupied[s]);

  // Handle partial MXD first
  for (const slot of emptyMxdSlots) {
    const partial = occupied.partialDoubles.get(slot) as PlayerWithRanking | undefined;
    if (!partial) continue;
    const pool = partial.gender === 'M' ? females : males;
    const maxG = partial.gender === 'M' ? femaleDistribution.maxGames : maleDistribution.maxGames;
    const avail = pool.filter((p) => countMixedDoublesForPlayer(assignment, p.id) < 1);
    const partner = findPartnerFor(
      partial, avail, assignment, existingDoubles, maxG, preAssignedCounts,
    );
    if (partner) assignment[slot] = [partial, partner];
  }

  // Generate remaining mixed pairs (strategy-specific), then sort by mix ranking
  const remainingMxdSlots = emptyMxdSlots.filter((s) => !assignment[s]);
  if (remainingMxdSlots.length > 0) {
    const mixedPairs = generateMixedPairs(
      males, females, remainingMxdSlots.length, assignment,
      maleDistribution, femaleDistribution, existingDoubles, preAssignedCounts,
    );
    const sortedMixed = sortPairsByRanking(mixedPairs, 'mix');
    for (let i = 0; i < remainingMxdSlots.length && i < sortedMixed.length; i++) {
      assignment[remainingMxdSlots[i]] = sortedMixed[i];
    }
  }

  ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');

  // Singles (strategy-specific)
  assignSingle(assignment, 'single1', males, occupied, maleMaxGames, preAssignedCounts);
  assignSingle(assignment, 'single2', males, occupied, maleMaxGames, preAssignedCounts);
  ensureSingleOrder(assignment, 'single1', 'single2');

  assignSingle(assignment, 'single3', females, occupied, femaleMaxGames, preAssignedCounts);
  assignSingle(assignment, 'single4', females, occupied, femaleMaxGames, preAssignedCounts);
  ensureSingleOrder(assignment, 'single3', 'single4');

  // Safety net + ordering
  fillAllSlotsMX(assignment, males, females, occupied, existingDoubles, preAssignedCounts);
  ensureSingleOrder(assignment, 'single1', 'single2');
  ensureSingleOrder(assignment, 'single3', 'single4');
  ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');

  return assignment;
}
