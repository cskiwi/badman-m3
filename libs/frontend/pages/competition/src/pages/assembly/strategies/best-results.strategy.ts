import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { HistoryData, OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
import {
  countPlayerInDoubles,
  ensureAllDoublesOrder,
  ensureAllSinglesOrder,
  ensureDoubleOrder,
  ensureSingleOrder,
  fillAllSlots,
  fillAllSlotsMX,
  getBestScoredPair,
  getExistingPairKeys,
  getUsedPlayerIds,
  getUsedSingleIds,
  orderDoublePair,
  rankingSum,
  scorePairs,
} from './assembly-helpers';

export function generateBestResults(
  players: PlayerWithRanking[],
  type: string,
  history: HistoryData,
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const assignment: SlotAssignment = {};
  const pairScores = scorePairs(history.games, players);

  if (type === SubEventTypeEnum.MX) {
    const males = players.filter((p) => p.gender === 'M').sort((a, b) => rankingSum(a, type) - rankingSum(b, type));
    const females = players.filter((p) => p.gender === 'F').sort((a, b) => rankingSum(a, type) - rankingSum(b, type));

    // MD
    if (!occupied.double1 && males.length >= 2) {
      const pair = getBestScoredPair(males, males, pairScores);
      if (pair) assignment.double1 = orderDoublePair(pair[0], pair[1], 'double');
    }

    // FD
    if (!occupied.double2 && females.length >= 2) {
      const pair = getBestScoredPair(females, females, pairScores);
      if (pair) assignment.double2 = orderDoublePair(pair[0], pair[1], 'double');
    }

    // MXD1
    if (!occupied.double3 && males.length >= 1 && females.length >= 1) {
      const excludePairs = getExistingPairKeys(assignment);
      const pair = getBestScoredPair(males, females, pairScores, excludePairs);
      if (pair) assignment.double3 = [pair[0], pair[1]];
    }

    // MXD2
    if (!occupied.double4 && males.length >= 1 && females.length >= 1) {
      const excludePairs = getExistingPairKeys(assignment);
      const usedM = getUsedPlayerIds(assignment, 'M');
      const usedF = getUsedPlayerIds(assignment, 'F');
      const availM = males.filter((m) => !usedM.includes(m.id) || countPlayerInDoubles(assignment, m.id, existingDoubles) < 2);
      const availF = females.filter((f) => !usedF.includes(f.id) || countPlayerInDoubles(assignment, f.id, existingDoubles) < 2);
      const pair = getBestScoredPair(availM, availF, pairScores, excludePairs);
      if (pair) assignment.double4 = [pair[0], pair[1]];
    }

    // Ensure mixed doubles order
    ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');

    // Singles — best ranked
    assignBestSingle(assignment, 'single1', males, occupied);
    assignBestSingle(assignment, 'single2', males, occupied);
    ensureSingleOrder(assignment, 'single1', 'single2');

    assignBestSingle(assignment, 'single3', females, occupied);
    assignBestSingle(assignment, 'single4', females, occupied);
    ensureSingleOrder(assignment, 'single3', 'single4');

    // Ensure all available players get games, fill any remaining empty slots
    fillAllSlotsMX(assignment, males, females, occupied, existingDoubles, preAssignedCounts);
    ensureSingleOrder(assignment, 'single1', 'single2');
    ensureSingleOrder(assignment, 'single3', 'single4');
    ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');
  } else {
    const pool = type === SubEventTypeEnum.M
      ? players.filter((p) => p.gender === 'M')
      : players.filter((p) => p.gender === 'F');
    pool.sort((a, b) => rankingSum(a, type) - rankingSum(b, type));

    // D1-D4
    const doubleSlots: ('double1' | 'double2' | 'double3' | 'double4')[] = ['double1', 'double2', 'double3', 'double4'];
    for (const slot of doubleSlots) {
      if (occupied[slot]) continue;
      const excludePairs = getExistingPairKeys(assignment);
      const usedIds = getUsedPlayerIds(assignment);
      const available = pool.filter((p) => !usedIds.includes(p.id) || countPlayerInDoubles(assignment, p.id, existingDoubles) < 2);
      const pair = getBestScoredPair(available, available, pairScores, excludePairs);
      if (pair) assignment[slot] = orderDoublePair(pair[0], pair[1], 'double');
    }

    ensureAllDoublesOrder(assignment);

    // S1-S4
    const singleSlots: ('single1' | 'single2' | 'single3' | 'single4')[] = ['single1', 'single2', 'single3', 'single4'];
    for (const slot of singleSlots) {
      assignBestSingle(assignment, slot, pool, occupied);
    }

    ensureAllSinglesOrder(assignment);

    // Ensure all available players get games, fill any remaining empty slots
    fillAllSlots(assignment, pool, occupied, existingDoubles, preAssignedCounts);
    ensureAllDoublesOrder(assignment);
    ensureAllSinglesOrder(assignment);
  }

  return assignment;
}

function assignBestSingle(
  assignment: SlotAssignment,
  slotKey: 'single1' | 'single2' | 'single3' | 'single4',
  pool: PlayerWithRanking[],
  occupied: OccupiedSlots,
) {
  if (occupied[slotKey]) return;
  const usedInSingles = getUsedSingleIds(assignment, occupied);
  const candidate = pool
    .filter((p) => !usedInSingles.includes(p.id))
    .sort((a, b) => (a.rankingLastPlaces?.[0]?.single ?? 12) - (b.rankingLastPlaces?.[0]?.single ?? 12))[0];
  if (candidate) assignment[slotKey] = candidate;
}
