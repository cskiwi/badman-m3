import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { HistoryData, OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
import {
  countMixedDoublesForPlayer,
  countPlayerGames,
  countPlayerInDoubles,
  ensureAllDoublesOrder,
  ensureAllSinglesOrder,
  ensureDoubleOrder,
  ensureSingleOrder,
  fillAllSlots,
  fillAllSlotsMX,
  findPartnerFor,
  getBestScoredPair,
  getExistingPairKeys,
  getTargetMaxGames,
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
    const maxGamesM = getTargetMaxGames(males.length, 6);
    const maxGamesF = getTargetMaxGames(females.length, 6);
    const gameCountFn = (id: string) => countPlayerGames(assignment, id, preAssignedCounts);

    // MD
    if (!occupied.double1) {
      const partial = occupied.partialDoubles.get('double1') as PlayerWithRanking | undefined;
      if (partial) {
        const avail = males.filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM);
        const partner = findPartnerFor(partial, avail, assignment, existingDoubles, maxGamesM, preAssignedCounts);
        if (partner) assignment.double1 = orderDoublePair(partial, partner, 'double');
      } else if (males.length >= 2) {
        const avail = males.filter(
          (m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM,
        );
        const pair = getBestScoredPair(avail, avail, pairScores, undefined, gameCountFn);
        if (pair) assignment.double1 = orderDoublePair(pair[0], pair[1], 'double');
      }
    }

    // FD
    if (!occupied.double2) {
      const partial = occupied.partialDoubles.get('double2') as PlayerWithRanking | undefined;
      if (partial) {
        const avail = females.filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF);
        const partner = findPartnerFor(partial, avail, assignment, existingDoubles, maxGamesF, preAssignedCounts);
        if (partner) assignment.double2 = orderDoublePair(partial, partner, 'double');
      } else if (females.length >= 2) {
        const avail = females.filter(
          (f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF,
        );
        const pair = getBestScoredPair(avail, avail, pairScores, undefined, gameCountFn);
        if (pair) assignment.double2 = orderDoublePair(pair[0], pair[1], 'double');
      }
    }

    // MXD1
    if (!occupied.double3) {
      const partial = occupied.partialDoubles.get('double3') as PlayerWithRanking | undefined;
      if (partial) {
        const pool = partial.gender === 'M' ? females : males;
        const maxG = partial.gender === 'M' ? maxGamesF : maxGamesM;
        const avail = pool.filter((p) => countMixedDoublesForPlayer(assignment, p.id) < 1);
        const partner = findPartnerFor(partial, avail, assignment, existingDoubles, maxG, preAssignedCounts);
        if (partner) assignment.double3 = [partial, partner];
      } else if (males.length >= 1 && females.length >= 1) {
        const excludePairs = getExistingPairKeys(assignment);
        const availM = males.filter(
          (m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM
            && countMixedDoublesForPlayer(assignment, m.id) < 1,
        );
        const availF = females.filter(
          (f) => countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF
            && countMixedDoublesForPlayer(assignment, f.id) < 1,
        );
        const pair = getBestScoredPair(availM, availF, pairScores, excludePairs, gameCountFn);
        if (pair) assignment.double3 = [pair[0], pair[1]];
      }
    }

    // MXD2
    if (!occupied.double4) {
      const partial = occupied.partialDoubles.get('double4') as PlayerWithRanking | undefined;
      if (partial) {
        const pool = partial.gender === 'M' ? females : males;
        const maxG = partial.gender === 'M' ? maxGamesF : maxGamesM;
        const avail = pool.filter((p) => countMixedDoublesForPlayer(assignment, p.id) < 1);
        const partner = findPartnerFor(partial, avail, assignment, existingDoubles, maxG, preAssignedCounts);
        if (partner) assignment.double4 = [partial, partner];
      } else if (males.length >= 1 && females.length >= 1) {
        const excludePairs = getExistingPairKeys(assignment);
        const usedM = getUsedPlayerIds(assignment, 'M');
        const usedF = getUsedPlayerIds(assignment, 'F');
        const availM = males.filter((m) =>
          (!usedM.includes(m.id) || countPlayerInDoubles(assignment, m.id, existingDoubles) < 2)
          && countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM
          && countMixedDoublesForPlayer(assignment, m.id) < 1,
        );
        const availF = females.filter((f) =>
          (!usedF.includes(f.id) || countPlayerInDoubles(assignment, f.id, existingDoubles) < 2)
          && countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF
          && countMixedDoublesForPlayer(assignment, f.id) < 1,
        );
        const pair = getBestScoredPair(availM, availF, pairScores, excludePairs, gameCountFn);
        if (pair) assignment.double4 = [pair[0], pair[1]];
      }
    }

    // Ensure mixed doubles order
    ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');

    // Singles — best ranked
    assignBestSingle(assignment, 'single1', males, occupied, maxGamesM, preAssignedCounts);
    assignBestSingle(assignment, 'single2', males, occupied, maxGamesM, preAssignedCounts);
    ensureSingleOrder(assignment, 'single1', 'single2');

    assignBestSingle(assignment, 'single3', females, occupied, maxGamesF, preAssignedCounts);
    assignBestSingle(assignment, 'single4', females, occupied, maxGamesF, preAssignedCounts);
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
    const maxGames = getTargetMaxGames(pool.length);

    // D1-D4
    const doubleSlots: ('double1' | 'double2' | 'double3' | 'double4')[] = ['double1', 'double2', 'double3', 'double4'];
    for (const slot of doubleSlots) {
      if (occupied[slot]) continue;

      // Handle partial double: keep pre-assigned player, find partner
      const partial = occupied.partialDoubles.get(slot) as PlayerWithRanking | undefined;
      if (partial) {
        const available = pool.filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames);
        const partner = findPartnerFor(partial, available, assignment, existingDoubles, maxGames, preAssignedCounts);
        if (partner) assignment[slot] = orderDoublePair(partial, partner, 'double');
        continue;
      }

      const excludePairs = getExistingPairKeys(assignment);
      const usedIds = getUsedPlayerIds(assignment);
      const available = pool
        .filter((p) => !usedIds.includes(p.id) || countPlayerInDoubles(assignment, p.id, existingDoubles) < 2)
        .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames);
      const pair = getBestScoredPair(available, available, pairScores, excludePairs);
      if (pair) assignment[slot] = orderDoublePair(pair[0], pair[1], 'double');
    }

    ensureAllDoublesOrder(assignment);

    // S1-S4
    const singleSlots: ('single1' | 'single2' | 'single3' | 'single4')[] = ['single1', 'single2', 'single3', 'single4'];
    for (const slot of singleSlots) {
      assignBestSingle(assignment, slot, pool, occupied, maxGames, preAssignedCounts);
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
  maxGames?: number,
  preAssignedCounts?: Map<string, number>,
) {
  if (occupied[slotKey]) return;
  const usedInSingles = getUsedSingleIds(assignment, occupied);
  const candidate = pool
    .filter((p) => !usedInSingles.includes(p.id))
    .filter((p) => maxGames == null || countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames)
    .sort((a, b) => (a.rankingLastPlaces?.[0]?.single ?? 12) - (b.rankingLastPlaces?.[0]?.single ?? 12))[0];
  if (candidate) assignment[slotKey] = candidate;
}
