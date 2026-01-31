import { RankingSystem, RankingPlace } from '@app/models';

/**
 * Gets the ranking levels while ensuring they are within valid bounds.
 * If a ranking value exceeds the system's amount of levels, it's capped to amountOfLevels.
 * If a ranking value is less than 1, it's set to 1.
 *
 * @param ranking The ranking levels object
 * @param system The ranking system containing amountOfLevels
 * @returns Protected ranking levels object
 */
export function getRankingProtected(
  ranking: Pick<RankingPlace, 'single' | 'double' | 'mix'>,
  system: Pick<RankingSystem, 'amountOfLevels' | 'maxDiffLevels'>,
): Pick<RankingPlace, 'single' | 'double' | 'mix'> {
  // Create object if no ranking is provided
  if (!ranking) {
    ranking = {} as Pick<RankingPlace, 'single' | 'double' | 'mix'>;
  }

  // if no system is provided, throw an error
  if (!system.amountOfLevels) {
    throw new Error('No amount of levels provided');
  }

  if (!system.maxDiffLevels) {
    throw new Error('No max diff levels provided');
  }

  ranking.single = ranking.single || system.amountOfLevels;
  ranking.double = ranking.double || system.amountOfLevels;
  ranking.mix = ranking.mix || system.amountOfLevels;

  const highest = Math.min(ranking.single, ranking.double, ranking.mix);

  if (ranking.single - highest >= (system.maxDiffLevels ?? 0)) {
    ranking.single = highest + (system.maxDiffLevels ?? 0);
  }
  if (ranking.double - highest >= (system.maxDiffLevels ?? 0)) {
    ranking.double = highest + (system.maxDiffLevels ?? 0);
  }
  if (ranking.mix - highest >= (system.maxDiffLevels ?? 0)) {
    ranking.mix = highest + (system.maxDiffLevels ?? 0);
  }

  if (ranking.single > system.amountOfLevels) {
    ranking.single = system.amountOfLevels;
  }
  if (ranking.double > system.amountOfLevels) {
    ranking.double = system.amountOfLevels;
  }
  if (ranking.mix > system.amountOfLevels) {
    ranking.mix = system.amountOfLevels;
  }

  return ranking;
}
