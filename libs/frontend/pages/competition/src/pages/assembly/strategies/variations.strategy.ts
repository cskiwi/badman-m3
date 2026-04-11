import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { HistoryData, OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
import {
  calculateGameDistribution,
  countCombinations,
  countHistoricalGames,
  countMixedDoublesForPlayer,
  countPlayerGames,
  countPlayerInDoubles,
  countSingleAppearances,
  executeMXPipeline,
  executeSameGenderPipeline,
  getExistingPairKeys,
  getLeastUsedPair,
  getUsedSingleIds,
  MixedPairGeneratorFn,
  PairGeneratorFn,
  SingleAssignerFn,
  rankingSum,
} from './helpers';

export function generateVariations(
  players: PlayerWithRanking[],
  type: string,
  history: HistoryData,
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const males = players.filter((p) => p.gender === 'M').sort((a, b) => rankingSum(a, type) - rankingSum(b, type));
  const females = players.filter((p) => p.gender === 'F').sort((a, b) => rankingSum(a, type) - rankingSum(b, type));

  const combinationCounts = countCombinations(history.assemblies);
  const historicalCounts = countHistoricalGames(history.assemblies);

  // Step 2 callbacks — closed over strategy-specific state
  const generatePairs: PairGeneratorFn = (pool, count, assignment, distribution, existingDoubles, preAssigned) =>
    buildVariationPairs(pool, count, assignment, distribution, existingDoubles, combinationCounts, preAssigned);

  const generateMixedPairs: MixedPairGeneratorFn = (males, females, count, assignment, maleDistrib, femaleDistrib, existingDoubles, preAssigned) =>
    buildVariationMixedPairs(males, females, count, assignment, maleDistrib, femaleDistrib, combinationCounts, existingDoubles, preAssigned);

  const assignSingle: SingleAssignerFn = (assignment, slotKey, pool, occupied, maxGamesFn, preAssigned) =>
    assignRotatedSingle(assignment, slotKey, pool, combinationCounts, occupied, maxGamesFn, preAssigned);

  if (type === SubEventTypeEnum.MX) {
    const maleDistribution = calculateGameDistribution(males, 6, preAssignedCounts, historicalCounts);
    const femaleDistribution = calculateGameDistribution(females, 6, preAssignedCounts, historicalCounts);
    return executeMXPipeline(
      males, females, occupied, existingDoubles,
      maleDistribution, femaleDistribution,
      generatePairs, generateMixedPairs, assignSingle,
      preAssignedCounts,
    );
  } else if (type === SubEventTypeEnum.M) {
    const distribution = calculateGameDistribution(males, 12, preAssignedCounts, historicalCounts);
    return executeSameGenderPipeline(
      males, occupied, existingDoubles, distribution,
      generatePairs, assignSingle, preAssignedCounts,
    );
  } else {
    const distribution = calculateGameDistribution(females, 12, preAssignedCounts, historicalCounts);
    return executeSameGenderPipeline(
      females, occupied, existingDoubles, distribution,
      generatePairs, assignSingle, preAssignedCounts,
    );
  }
}

// ---------------------------------------------------------------------------
// Step 2 — Variation pair generation (least-used combinations)
// ---------------------------------------------------------------------------

function buildVariationPairs(
  pool: PlayerWithRanking[],
  count: number,
  assignment: SlotAssignment,
  distribution: { budgets: Map<string, { targetGames: number }>; maxGames: number },
  existingDoubles: PlayerWithRanking[][],
  combinationCounts: Map<string, number>,
  preAssignedCounts?: Map<string, number>,
): [PlayerWithRanking, PlayerWithRanking][] {
  const pairs: [PlayerWithRanking, PlayerWithRanking][] = [];
  const pendingDoubles = new Map<string, number>();
  const maxGamesFn = (id: string) => distribution.budgets.get(id)?.targetGames ?? distribution.maxGames;

  for (let i = 0; i < count; i++) {
    const excludePairs = new Set([
      ...getExistingPairKeys(assignment),
      ...pairs.map((p) => [p[0].id, p[1].id].sort().join(':')),
    ]);

    const available = pool.filter((p) => {
      const totalDoubles = countPlayerInDoubles(assignment, p.id, existingDoubles) + (pendingDoubles.get(p.id) ?? 0);
      const totalGames = countPlayerGames(assignment, p.id, preAssignedCounts) + (pendingDoubles.get(p.id) ?? 0);
      return totalDoubles < 2 && totalGames < maxGamesFn(p.id);
    });

    const gameCountFn = (id: string) =>
      countPlayerGames(assignment, id, preAssignedCounts) + (pendingDoubles.get(id) ?? 0);
    const pair = getLeastUsedPair(available, available, combinationCounts, excludePairs, gameCountFn);
    if (!pair) break;
    pairs.push([pair[0], pair[1]]);
    pendingDoubles.set(pair[0].id, (pendingDoubles.get(pair[0].id) ?? 0) + 1);
    pendingDoubles.set(pair[1].id, (pendingDoubles.get(pair[1].id) ?? 0) + 1);
  }

  return pairs;
}

function buildVariationMixedPairs(
  males: PlayerWithRanking[],
  females: PlayerWithRanking[],
  count: number,
  assignment: SlotAssignment,
  maleDistribution: { budgets: Map<string, { targetGames: number }>; maxGames: number },
  femaleDistribution: { budgets: Map<string, { targetGames: number }>; maxGames: number },
  combinationCounts: Map<string, number>,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): [PlayerWithRanking, PlayerWithRanking][] {
  const pairs: [PlayerWithRanking, PlayerWithRanking][] = [];
  const pendingDoubles = new Map<string, number>();
  const maleMaxGames = (id: string) => maleDistribution.budgets.get(id)?.targetGames ?? maleDistribution.maxGames;
  const femaleMaxGames = (id: string) => femaleDistribution.budgets.get(id)?.targetGames ?? femaleDistribution.maxGames;

  for (let i = 0; i < count; i++) {
    const excludePairs = new Set([
      ...getExistingPairKeys(assignment),
      ...pairs.map((p) => [p[0].id, p[1].id].sort().join(':')),
    ]);

    const availM = males.filter((m) => {
      const totalDoubles = countPlayerInDoubles(assignment, m.id, existingDoubles) + (pendingDoubles.get(m.id) ?? 0);
      const totalGames = countPlayerGames(assignment, m.id, preAssignedCounts) + (pendingDoubles.get(m.id) ?? 0);
      return totalDoubles < 2 && totalGames < maleMaxGames(m.id) && countMixedDoublesForPlayer(assignment, m.id) + (pendingDoubles.get(m.id) ?? 0) < 1;
    });
    const availF = females.filter((f) => {
      const totalDoubles = countPlayerInDoubles(assignment, f.id, existingDoubles) + (pendingDoubles.get(f.id) ?? 0);
      const totalGames = countPlayerGames(assignment, f.id, preAssignedCounts) + (pendingDoubles.get(f.id) ?? 0);
      return totalDoubles < 2 && totalGames < femaleMaxGames(f.id) && countMixedDoublesForPlayer(assignment, f.id) + (pendingDoubles.get(f.id) ?? 0) < 1;
    });

    const gameCountFn = (id: string) =>
      countPlayerGames(assignment, id, preAssignedCounts) + (pendingDoubles.get(id) ?? 0);
    const pair = getLeastUsedPair(availM, availF, combinationCounts, excludePairs, gameCountFn);
    if (!pair) break;
    pairs.push([pair[0], pair[1]]);
    pendingDoubles.set(pair[0].id, (pendingDoubles.get(pair[0].id) ?? 0) + 1);
    pendingDoubles.set(pair[1].id, (pendingDoubles.get(pair[1].id) ?? 0) + 1);
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Singles — rotate by least appearances
// ---------------------------------------------------------------------------

function assignRotatedSingle(
  assignment: SlotAssignment,
  slotKey: 'single1' | 'single2' | 'single3' | 'single4',
  pool: PlayerWithRanking[],
  combinationCounts: Map<string, number>,
  occupied: OccupiedSlots,
  playerMaxGamesFn: (id: string) => number,
  preAssignedCounts?: Map<string, number>,
) {
  if (occupied[slotKey] || pool.length === 0) return;
  const usedInSingles = getUsedSingleIds(assignment, occupied);
  const singleCounts = countSingleAppearances(pool.map((p) => p.id), combinationCounts);
  const candidate = pool
    .filter((p) => !usedInSingles.includes(p.id))
    .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < playerMaxGamesFn(p.id))
    .sort((a, b) => (singleCounts.get(a.id) ?? 0) - (singleCounts.get(b.id) ?? 0))[0];
  if (candidate) assignment[slotKey] = candidate;
}
