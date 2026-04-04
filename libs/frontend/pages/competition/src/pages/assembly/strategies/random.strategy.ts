import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
import {
  countPlayerInDoubles,
  ensureAllDoublesOrder,
  ensureAllSinglesOrder,
  ensureDoubleOrder,
  ensureSingleOrder,
  fillAllSlots,
  fillAllSlotsMX,
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

  // MD
  if (!occupied.double1 && males.length >= 2) {
    assignment.double1 = orderDoublePair(males[0], males[1], 'double');
  }

  // FD
  if (!occupied.double2 && females.length >= 2) {
    assignment.double2 = orderDoublePair(females[0], females[1], 'double');
  }

  // MXD1
  if (!occupied.double3) {
    const usedM = getUsedPlayerIds(assignment, 'M');
    const usedF = getUsedPlayerIds(assignment, 'F');
    const availM = males.filter((m) => !usedM.includes(m.id) || countPlayerInDoubles(assignment, m.id, existingDoubles) < 2);
    const availF = females.filter((f) => !usedF.includes(f.id) || countPlayerInDoubles(assignment, f.id, existingDoubles) < 2);
    if (availM.length >= 1 && availF.length >= 1) {
      assignment.double3 = [availM[0], availF[0]];
    }
  }

  // MXD2
  if (!occupied.double4) {
    const usedM = getUsedPlayerIds(assignment, 'M');
    const usedF = getUsedPlayerIds(assignment, 'F');
    const availM = males.filter((m) => !usedM.includes(m.id) || countPlayerInDoubles(assignment, m.id, existingDoubles) < 2);
    const availF = females.filter((f) => !usedF.includes(f.id) || countPlayerInDoubles(assignment, f.id, existingDoubles) < 2);
    if (availM.length >= 1 && availF.length >= 1) {
      assignment.double4 = [availM[0], availF[0]];
    }
  }

  // Singles — assign randomly from unused players
  const usedSingles: string[] = [...(occupied.preAssignedSingleIds ?? [])];
  const maleSingles = males.sort(() => Math.random() - 0.5);
  const femaleSingles = females.sort(() => Math.random() - 0.5);

  if (!occupied.single1 && maleSingles.length >= 1) {
    assignment.single1 = maleSingles[0];
    usedSingles.push(maleSingles[0].id);
  }
  if (!occupied.single2 && maleSingles.length >= 2) {
    const next = maleSingles.find((m) => !usedSingles.includes(m.id));
    if (next) { assignment.single2 = next; usedSingles.push(next.id); }
  }
  if (!occupied.single3 && femaleSingles.length >= 1) {
    assignment.single3 = femaleSingles[0];
    usedSingles.push(femaleSingles[0].id);
  }
  if (!occupied.single4 && femaleSingles.length >= 2) {
    const next = femaleSingles.find((f) => !usedSingles.includes(f.id));
    if (next) { assignment.single4 = next; usedSingles.push(next.id); }
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
  // Doubles — ensure different pairs
  const doubleSlots: ('double1' | 'double2' | 'double3' | 'double4')[] = ['double1', 'double2', 'double3', 'double4'];
  const usedPairs = new Set<string>();
  for (const slot of doubleSlots) {
    if (occupied[slot]) continue;
    const usedIds = getUsedPlayerIds(assignment);
    const available = pool.filter((p) => !usedIds.includes(p.id) || countPlayerInDoubles(assignment, p.id, existingDoubles) < 2);
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

  // Singles — assign all slots
  const singleSlots: ('single1' | 'single2' | 'single3' | 'single4')[] = ['single1', 'single2', 'single3', 'single4'];
  const singlePool = pool.sort(() => Math.random() - 0.5);
  const singleUsed: string[] = [...(occupied.preAssignedSingleIds ?? [])];

  for (const slot of singleSlots) {
    if (occupied[slot]) continue;
    const candidate = singlePool.find((p) => !singleUsed.includes(p.id));
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
