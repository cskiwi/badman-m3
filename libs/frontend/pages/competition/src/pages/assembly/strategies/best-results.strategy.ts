import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { HistoryData, OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
import {
  calculateGameDistribution,
  countHistoricalGames,
  countMixedDoublesForPlayer,
  countPlayerGames,
  countPlayerInDoubles,
  executeMXPipeline,
  executeSameGenderPipeline,
  getBestScoredPair,
  getExistingPairKeys,
  getUsedSingleIds,
  MixedPairGeneratorFn,
  PairGeneratorFn,
  SingleAssignerFn,
  rankingSum,
  scorePairs,
} from './helpers';

export function generateBestResults(
  players: PlayerWithRanking[],
  type: string,
  history: HistoryData,
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const pairScores = scorePairs(history.games, players);
  const historicalCounts = countHistoricalGames(history.assemblies);

  // Step 2 callbacks — closed over strategy-specific state
  const generatePairs: PairGeneratorFn = (pool, count, assignment, distribution, existingDoubles, preAssigned) =>
    buildBestResultPairs(pool, count, assignment, distribution, existingDoubles, pairScores, preAssigned);

  const generateMixedPairs: MixedPairGeneratorFn = (males, females, count, assignment, maleDistrib, femaleDistrib, existingDoubles, preAssigned) =>
    buildBestResultMixedPairs(males, females, count, assignment, maleDistrib, femaleDistrib, pairScores, existingDoubles, preAssigned);

  const assignSingle: SingleAssignerFn = (assignment, slotKey, pool, occupied, maxGamesFn, preAssigned) =>
    assignBestSingle(assignment, slotKey, pool, occupied, maxGamesFn, preAssigned);

  if (type === SubEventTypeEnum.MX) {
    const males = players.filter((p) => p.gender === 'M').sort((a, b) => rankingSum(a, type) - rankingSum(b, type));
    const females = players.filter((p) => p.gender === 'F').sort((a, b) => rankingSum(a, type) - rankingSum(b, type));
    const maleDistribution = calculateGameDistribution(males, 6, preAssignedCounts, historicalCounts);
    const femaleDistribution = calculateGameDistribution(females, 6, preAssignedCounts, historicalCounts);
    return executeMXPipeline(
      males, females, occupied, existingDoubles,
      maleDistribution, femaleDistribution,
      generatePairs, generateMixedPairs, assignSingle,
      preAssignedCounts,
    );
  }

  const pool = type === SubEventTypeEnum.M
    ? players.filter((p) => p.gender === 'M')
    : players.filter((p) => p.gender === 'F');
  pool.sort((a, b) => rankingSum(a, type) - rankingSum(b, type));
  const distribution = calculateGameDistribution(pool, 12, preAssignedCounts, historicalCounts);
  return executeSameGenderPipeline(
    pool, occupied, existingDoubles, distribution,
    generatePairs, assignSingle,
    preAssignedCounts,
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Best-results pair generation (highest win rate)
// ---------------------------------------------------------------------------

function buildBestResultPairs(
  pool: PlayerWithRanking[],
  count: number,
  assignment: SlotAssignment,
  distribution: { budgets: Map<string, { targetGames: number }>; maxGames: number },
  existingDoubles: PlayerWithRanking[][],
  pairScores: Map<string, { wins: number; total: number }>,
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
    const pair = getBestScoredPair(available, available, pairScores, excludePairs, gameCountFn);
    if (!pair) break;
    pairs.push([pair[0], pair[1]]);
    pendingDoubles.set(pair[0].id, (pendingDoubles.get(pair[0].id) ?? 0) + 1);
    pendingDoubles.set(pair[1].id, (pendingDoubles.get(pair[1].id) ?? 0) + 1);
  }

  return pairs;
}

function buildBestResultMixedPairs(
  males: PlayerWithRanking[],
  females: PlayerWithRanking[],
  count: number,
  assignment: SlotAssignment,
  maleDistribution: { budgets: Map<string, { targetGames: number }>; maxGames: number },
  femaleDistribution: { budgets: Map<string, { targetGames: number }>; maxGames: number },
  pairScores: Map<string, { wins: number; total: number }>,
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
    const pair = getBestScoredPair(availM, availF, pairScores, excludePairs, gameCountFn);
    if (!pair) break;
    pairs.push([pair[0], pair[1]]);
    pendingDoubles.set(pair[0].id, (pendingDoubles.get(pair[0].id) ?? 0) + 1);
    pendingDoubles.set(pair[1].id, (pendingDoubles.get(pair[1].id) ?? 0) + 1);
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Singles — best ranked
// ---------------------------------------------------------------------------

function assignBestSingle(
  assignment: SlotAssignment,
  slotKey: 'single1' | 'single2' | 'single3' | 'single4',
  pool: PlayerWithRanking[],
  occupied: OccupiedSlots,
  playerMaxGamesFn: (id: string) => number,
  preAssignedCounts?: Map<string, number>,
) {
  if (occupied[slotKey]) return;
  const usedInSingles = getUsedSingleIds(assignment, occupied);
  const candidate = pool
    .filter((p) => !usedInSingles.includes(p.id))
    .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < playerMaxGamesFn(p.id))
    .sort((a, b) => (a.rankingLastPlaces?.[0]?.single ?? 12) - (b.rankingLastPlaces?.[0]?.single ?? 12))[0];
  if (candidate) assignment[slotKey] = candidate;
}
