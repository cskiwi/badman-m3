import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
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
  getTargetMaxGames,
  getUsedPlayerIds,
  orderDoublePair,
} from './assembly-helpers';

export function generateRandom(
  players: PlayerWithRanking[],
  type: string,
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const assignment: SlotAssignment = {};
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  if (type === SubEventTypeEnum.MX) {
    generateMXRandom(assignment, shuffled, occupied, existingDoubles, preAssignedCounts);
  } else {
    const pool = shuffled.filter((p) =>
      type === SubEventTypeEnum.M ? p.gender === 'M' : p.gender === 'F',
    );
    generateSameGenderRandom(assignment, pool, occupied, existingDoubles, preAssignedCounts);
  }

  return assignment;
}

function generateMXRandom(
  assignment: SlotAssignment,
  shuffled: PlayerWithRanking[],
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
) {
  const males = shuffled.filter((p) => p.gender === 'M');
  const females = shuffled.filter((p) => p.gender === 'F');
  const maxGamesM = getTargetMaxGames(males.length, 6);
  const maxGamesF = getTargetMaxGames(females.length, 6);

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
      if (avail.length >= 2) {
        assignment.double1 = orderDoublePair(avail[0], avail[1], 'double');
      }
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
      if (avail.length >= 2) {
        assignment.double2 = orderDoublePair(avail[0], avail[1], 'double');
      }
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
    } else {
      const usedM = getUsedPlayerIds(assignment, 'M');
      const usedF = getUsedPlayerIds(assignment, 'F');
      const availM = males.filter((m) =>
        (!usedM.includes(m.id) || countPlayerInDoubles(assignment, m.id, existingDoubles) < 2)
        && countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM
        && countMixedDoublesForPlayer(assignment, m.id) < 1,
      ).sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const availF = females.filter((f) =>
        (!usedF.includes(f.id) || countPlayerInDoubles(assignment, f.id, existingDoubles) < 2)
        && countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF
        && countMixedDoublesForPlayer(assignment, f.id) < 1,
      ).sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      if (availM.length >= 1 && availF.length >= 1) {
        assignment.double3 = [availM[0], availF[0]];
      }
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
    } else {
      const usedM = getUsedPlayerIds(assignment, 'M');
      const usedF = getUsedPlayerIds(assignment, 'F');
      const availM = males.filter((m) =>
        (!usedM.includes(m.id) || countPlayerInDoubles(assignment, m.id, existingDoubles) < 2)
        && countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM
        && countMixedDoublesForPlayer(assignment, m.id) < 1,
      ).sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      const availF = females.filter((f) =>
        (!usedF.includes(f.id) || countPlayerInDoubles(assignment, f.id, existingDoubles) < 2)
        && countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF
        && countMixedDoublesForPlayer(assignment, f.id) < 1,
      ).sort((a, b) => countPlayerGames(assignment, a.id, preAssignedCounts) - countPlayerGames(assignment, b.id, preAssignedCounts));
      if (availM.length >= 1 && availF.length >= 1) {
        assignment.double4 = [availM[0], availF[0]];
      }
    }
  }

  // Singles — assign randomly from unused players, respecting game limits
  const usedSingles: string[] = [...(occupied.preAssignedSingleIds ?? [])];
  const maleSingles = males.sort(() => Math.random() - 0.5);
  const femaleSingles = females.sort(() => Math.random() - 0.5);

  if (!occupied.single1) {
    const candidate = maleSingles.find(
      (m) => !usedSingles.includes(m.id) && countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM,
    );
    if (candidate) { assignment.single1 = candidate; usedSingles.push(candidate.id); }
  }
  if (!occupied.single2) {
    const candidate = maleSingles.find(
      (m) => !usedSingles.includes(m.id) && countPlayerGames(assignment, m.id, preAssignedCounts) < maxGamesM,
    );
    if (candidate) { assignment.single2 = candidate; usedSingles.push(candidate.id); }
  }
  if (!occupied.single3) {
    const candidate = femaleSingles.find(
      (f) => !usedSingles.includes(f.id) && countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF,
    );
    if (candidate) { assignment.single3 = candidate; usedSingles.push(candidate.id); }
  }
  if (!occupied.single4) {
    const candidate = femaleSingles.find(
      (f) => !usedSingles.includes(f.id) && countPlayerGames(assignment, f.id, preAssignedCounts) < maxGamesF,
    );
    if (candidate) { assignment.single4 = candidate; usedSingles.push(candidate.id); }
  }

  // Fill any remaining empty slots ensuring all players participate
  fillAllSlotsMX(assignment, males, females, occupied, existingDoubles, preAssignedCounts);
  ensureSingleOrder(assignment, 'single1', 'single2');
  ensureSingleOrder(assignment, 'single3', 'single4');
  ensureDoubleOrder(assignment, 'double3', 'double4', 'mix');
}

function generateSameGenderRandom(
  assignment: SlotAssignment,
  pool: PlayerWithRanking[],
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
) {
  const maxGames = getTargetMaxGames(pool.length);

  // Doubles — ensure different pairs
  const doubleSlots: ('double1' | 'double2' | 'double3' | 'double4')[] = ['double1', 'double2', 'double3', 'double4'];
  const usedPairs = new Set<string>();
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

    const usedIds = getUsedPlayerIds(assignment);
    const available = pool
      .filter((p) => !usedIds.includes(p.id) || countPlayerInDoubles(assignment, p.id, existingDoubles) < 2)
      .filter((p) => countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames);
    // Find a pair we haven't used yet
    let assigned = false;
    for (let i = 0; i < available.length && !assigned; i++) {
      for (let j = i + 1; j < available.length && !assigned; j++) {
        const key = [available[i].id, available[j].id].sort().join(':');
        if (!usedPairs.has(key)) {
          assignment[slot] = orderDoublePair(available[i], available[j], 'double');
          usedPairs.add(key);
          assigned = true;
        }
      }
    }
  }

  // Singles — assign all slots, respecting game limits
  const singleSlots: ('single1' | 'single2' | 'single3' | 'single4')[] = ['single1', 'single2', 'single3', 'single4'];
  const singlePool = pool.sort(() => Math.random() - 0.5);
  const singleUsed: string[] = [...(occupied.preAssignedSingleIds ?? [])];

  for (const slot of singleSlots) {
    if (occupied[slot]) continue;
    const candidate = singlePool.find(
      (p) => !singleUsed.includes(p.id) && countPlayerGames(assignment, p.id, preAssignedCounts) < maxGames,
    );
    if (candidate) {
      assignment[slot] = candidate;
      singleUsed.push(candidate.id);
    }
  }

  // Fill any remaining empty slots ensuring all players participate
  fillAllSlots(assignment, pool, occupied, existingDoubles, preAssignedCounts);
  ensureAllDoublesOrder(assignment);
  ensureAllSinglesOrder(assignment);
}
