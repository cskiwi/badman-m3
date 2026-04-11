import { SubEventTypeEnum } from '@app/models-enum';
import { PlayerWithRanking } from '../page-assembly.service';
import { OccupiedSlots, SlotAssignment } from './assembly-strategy.types';
import {
  calculateGameDistribution,
  countMixedDoublesForPlayer,
  countPlayerGames,
  countPlayerInDoubles,
  executeMXPipeline,
  executeSameGenderPipeline,
  GameDistributionResult,
  getUsedSingleIds,
  MixedPairGeneratorFn,
  PairGeneratorFn,
  SingleAssignerFn,
} from './helpers';

export function generateRandom(
  players: PlayerWithRanking[],
  type: string,
  occupied: OccupiedSlots,
  existingDoubles: PlayerWithRanking[][],
  preAssignedCounts?: Map<string, number>,
): SlotAssignment {
  const shuffled = [...players].sort(() => Math.random() - 0.5);

  if (type === SubEventTypeEnum.MX) {
    const males = shuffled.filter((p) => p.gender === 'M');
    const females = shuffled.filter((p) => p.gender === 'F');
    const maleDistrib = calculateGameDistribution(males, 6, preAssignedCounts);
    const femaleDistrib = calculateGameDistribution(females, 6, preAssignedCounts);
    return executeMXPipeline(
      males, females, occupied, existingDoubles,
      maleDistrib, femaleDistrib,
      randomPairGenerator, randomMixedPairGenerator, randomSingleAssigner,
      preAssignedCounts,
    );
  }

  const pool = shuffled.filter((p) =>
    type === SubEventTypeEnum.M ? p.gender === 'M' : p.gender === 'F',
  );
  const distribution = calculateGameDistribution(pool, 12, preAssignedCounts);
  return executeSameGenderPipeline(
    pool, occupied, existingDoubles, distribution,
    randomPairGenerator, randomSingleAssigner,
    preAssignedCounts,
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Random pair generation
// ---------------------------------------------------------------------------

/**
 * Build random pairings that respect per-player doubles budgets.
 * Players who need more doubles get priority.
 */
const randomPairGenerator: PairGeneratorFn = (
  pool, count, assignment, distribution, existingDoubles, preAssignedCounts,
) => {
  const remainingDoubles = new Map<string, number>();
  for (const p of pool) {
    const budget = distribution.budgets.get(p.id);
    if (!budget) continue;
    const currentDoubles = countPlayerInDoubles(assignment, p.id, existingDoubles);
    const currentGames = countPlayerGames(assignment, p.id, preAssignedCounts);
    const maxDoublesLeft = Math.min(2 - currentDoubles, budget.targetGames - currentGames);
    remainingDoubles.set(p.id, Math.max(0, maxDoublesLeft));
  }

  const pairs: [PlayerWithRanking, PlayerWithRanking][] = [];
  for (let i = 0; i < count; i++) {
    const candidates = pool
      .filter((p) => (remainingDoubles.get(p.id) ?? 0) > 0)
      .sort((a, b) => {
        const ra = remainingDoubles.get(a.id) ?? 0;
        const rb = remainingDoubles.get(b.id) ?? 0;
        if (ra !== rb) return rb - ra;
        return Math.random() - 0.5;
      });
    if (candidates.length < 2) break;
    const [p1, p2] = candidates;
    pairs.push([p1, p2]);
    remainingDoubles.set(p1.id, (remainingDoubles.get(p1.id) ?? 1) - 1);
    remainingDoubles.set(p2.id, (remainingDoubles.get(p2.id) ?? 1) - 1);
  }
  return pairs;
};

/**
 * Build random mixed-doubles pairings (one male + one female each).
 */
const randomMixedPairGenerator: MixedPairGeneratorFn = (
  males, females, count, assignment, maleDistribution, femaleDistribution, existingDoubles, preAssignedCounts,
) => {
  const maleMaxGames = (id: string) =>
    maleDistribution.budgets.get(id)?.targetGames ?? maleDistribution.maxGames;
  const femaleMaxGames = (id: string) =>
    femaleDistribution.budgets.get(id)?.targetGames ?? femaleDistribution.maxGames;

  const availM = males
    .filter((m) => countPlayerGames(assignment, m.id, preAssignedCounts) < maleMaxGames(m.id))
    .filter((m) => countMixedDoublesForPlayer(assignment, m.id) < 1)
    .filter((m) => countPlayerInDoubles(assignment, m.id, existingDoubles) < 2)
    .sort(() => Math.random() - 0.5);
  const availF = females
    .filter((f) => countPlayerGames(assignment, f.id, preAssignedCounts) < femaleMaxGames(f.id))
    .filter((f) => countMixedDoublesForPlayer(assignment, f.id) < 1)
    .filter((f) => countPlayerInDoubles(assignment, f.id, existingDoubles) < 2)
    .sort(() => Math.random() - 0.5);

  const pairs: [PlayerWithRanking, PlayerWithRanking][] = [];
  for (let i = 0; i < count && i < availM.length && i < availF.length; i++) {
    pairs.push([availM[i], availF[i]]);
  }
  return pairs;
};

// ---------------------------------------------------------------------------
// Singles — random assignment
// ---------------------------------------------------------------------------

const randomSingleAssigner: SingleAssignerFn = (
  assignment, slotKey, pool, occupied, maxGamesFn, preAssignedCounts,
) => {
  if (occupied[slotKey]) return;
  const usedInSingles = getUsedSingleIds(assignment, occupied);
  const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
  const candidate = shuffledPool.find(
    (p) => !usedInSingles.includes(p.id)
      && countPlayerGames(assignment, p.id, preAssignedCounts) < maxGamesFn(p.id),
  );
  if (candidate) assignment[slotKey] = candidate;
};
