import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { HistoryData, OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
import {
  countCombinations,
  countMixedDoublesForPlayer,
  countPlayerGames,
  countPlayerInDoubles,
  countSingleAppearances,
  ensureAllDoublesOrder,
  ensureAllSinglesOrder,
  ensureDoubleOrder,
  ensureSingleOrder,
  fillAllSlots,
  fillAllSlotsMX,
  findPartnerFor,
  getExistingPairKeys,
  getLeastUsedPair,
  getTargetMaxGames,
  getUsedPlayerIds,
  getUsedSingleIds,
  orderDoublePair,
  rankingSum,
} from './assembly-helpers';

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

  if (type === SubEventTypeEnum.MX) {
    return generateMXVariations(males, females, combinationCounts, occupied, existingDoubles, preAssignedCounts);
  } else if (type === SubEventTypeEnum.M) {
    return generateSameGenderVariations(males, combinationCounts, occupied, existingDoubles, preAssignedCounts);
  } else {
    return generateSameGenderVariations(females, combinationCounts, occupied, existingDoubles, preAssignedCounts);
  }
}

function generateMXVariations(
  males: PlayerWithRanking[],
  females: PlayerWithRanking[],
  combinationCounts: Map<string, number>,
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const assignment: SlotAssignment = {};
  const maxGamesM = getTargetMaxGames(males.length, 6);
  const maxGamesF = getTargetMaxGames(females.length, 6);

  const gameCountFn = (id: string) => countPlayerGames(assignment, id, preAssignedCounts);

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
      const pair = getLeastUsedPair(avail, avail, combinationCounts, undefined, gameCountFn);
      if (pair) assignment.double1 = orderDoublePair(pair[0], pair[1], 'double');
    }
  }

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
      const pair = getLeastUsedPair(avail, avail, combinationCounts, undefined, gameCountFn);
      if (pair) assignment.double2 = orderDoublePair(pair[0], pair[1], 'double');
    }
  }

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
      const pair = getLeastUsedPair(availM, availF, combinationCounts, excludePairs, gameCountFn);
      if (pair) assignment.double3 = [pair[0], pair[1]];
    }
  }

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
      const usedMales = getUsedPlayerIds(assignment, 'M');
      const usedFemales = getUsedPlayerIds(assignment, 'F');
      const availMales = males.filter((m) =>
        (!usedMales.includes(m.id) || countPlayerInDoubles(assignment, m.id, existingDoubles) < 2)
        && countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM
        && countMixedDoublesForPlayer(assignment, m.id) < 1,
      );
      const availFemales = females.filter((f) =>
        (!usedFemales.includes(f.id) || countPlayerInDoubles(assignment, f.id, existingDoubles) < 2)
        && countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF
        && countMixedDoublesForPlayer(assignment, f.id) < 1,
      );
      const pair = getLeastUsedPair(availMales, availFemales, combinationCounts, excludePairs, gameCountFn);
      if (pair) assignment.double4 = [pair[0], pair[1]];
    }
  }

  // Ensure mixed doubles are ordered by mix ranking
  ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');

  // Singles — rotate who plays
  assignRotatedSingle(assignment, 'single1', males, combinationCounts, occupied, maxGamesM, preAssignedCounts);
  assignRotatedSingle(assignment, 'single2', males, combinationCounts, occupied, maxGamesM, preAssignedCounts);
  ensureSingleOrder(assignment, 'single1', 'single2');

  assignRotatedSingle(assignment, 'single3', females, combinationCounts, occupied, maxGamesF, preAssignedCounts);
  assignRotatedSingle(assignment, 'single4', females, combinationCounts, occupied, maxGamesF, preAssignedCounts);
  ensureSingleOrder(assignment, 'single3', 'single4');

  // Ensure all available players get games, fill any remaining empty slots
  fillAllSlotsMX(assignment, males, females, occupied, existingDoubles, preAssignedCounts);
  ensureSingleOrder(assignment, 'single1', 'single2');
  ensureSingleOrder(assignment, 'single3', 'single4');
  ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');

  return assignment;
}

function generateSameGenderVariations(
  players: PlayerWithRanking[],
  combinationCounts: Map<string, number>,
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const assignment: SlotAssignment = {};
  const maxGames = getTargetMaxGames(players.length);

  // D1-D4
  const doubleSlots: ('double1' | 'double2' | 'double3' | 'double4')[] = ['double1', 'double2', 'double3', 'double4'];
  for (const slot of doubleSlots) {
    if (occupied[slot]) continue;

    // Handle partial double: keep pre-assigned player, find partner
    const partial = occupied.partialDoubles.get(slot) as PlayerWithRanking | undefined;
    if (partial) {
      const available = players
        .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames);
      const partner = findPartnerFor(partial, available, assignment, existingDoubles, maxGames, preAssignedCounts);
      if (partner) assignment[slot] = orderDoublePair(partial, partner, 'double');
      continue;
    }

    const excludePairs = getExistingPairKeys(assignment);
    const usedIds = getUsedPlayerIds(assignment);
    const available = players
      .filter((p) => !usedIds.includes(p.id) || countPlayerInDoubles(assignment, p.id, existingDoubles) < 2)
      .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames);
    const pair = getLeastUsedPair(available, available, combinationCounts, excludePairs);
    if (pair) assignment[slot] = orderDoublePair(pair[0], pair[1], 'double');
  }

  ensureDoubleOrder(assignment, 'double1', 'double2');
  ensureDoubleOrder(assignment, 'double3', 'double4');
  ensureAllDoublesOrder(assignment);

  // S1-S4
  const minPlayers = [1, 2, 3, 4];
  const singleSlots: ('single1' | 'single2' | 'single3' | 'single4')[] = ['single1', 'single2', 'single3', 'single4'];
  for (let i = 0; i < singleSlots.length; i++) {
    if (players.length >= minPlayers[i]) {
      assignRotatedSingle(assignment, singleSlots[i], players, combinationCounts, occupied, maxGames, preAssignedCounts);
    }
  }

  ensureAllSinglesOrder(assignment);

  // Ensure all available players get games, fill any remaining empty slots
  fillAllSlots(assignment, players, occupied, existingDoubles, preAssignedCounts);
  ensureAllDoublesOrder(assignment);
  ensureAllSinglesOrder(assignment);

  return assignment;
}

function assignRotatedSingle(
  assignment: SlotAssignment,
  slotKey: 'single1' | 'single2' | 'single3' | 'single4',
  pool: PlayerWithRanking[],
  combinationCounts: Map<string, number>,
  occupied: OccupiedSlots,
  maxGames?: number,
  preAssignedCounts?: Map<string, number>,
) {
  if (occupied[slotKey] || pool.length === 0) return;
  const usedInSingles = getUsedSingleIds(assignment, occupied);
  const singleCounts = countSingleAppearances(pool.map((p) => p.id), combinationCounts);
  const candidate = pool
    .filter((p) => !usedInSingles.includes(p.id))
    .filter((p) => maxGames == null || countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames)
    .sort((a, b) => (singleCounts.get(a.id) ?? 0) - (singleCounts.get(b.id) ?? 0))[0];
  if (candidate) assignment[slotKey] = candidate;
}
