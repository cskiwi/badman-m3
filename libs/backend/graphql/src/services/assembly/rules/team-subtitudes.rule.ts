import { SubEventTypeEnum } from '@app/models-enum';
import { AssemblyValidationError } from '../assembly-output';
import { ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class TeamSubtitudesRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { meta, type, team, subtitudes, system } = data;
    const warnings: AssemblyValidationError[] = [];

    if (!system?.amountOfLevels) return { valid: true, errors: [] };
    if (team?.teamNumber === 1) return { valid: true, errors: [], warnings };

    const sortedPlayers = meta?.competition?.players
      ?.map((player) => ({
        player,
        sum:
          (player.single ?? system.amountOfLevels!) +
          (player.double ?? system.amountOfLevels!) +
          (type === SubEventTypeEnum.MX ? (player.mix ?? system.amountOfLevels!) : 0),
      }))
      .filter(Boolean)
      .sort((a, b) => b.sum - a.sum);

    for (const sub of subtitudes ?? []) {
      const subRanking = sub?.rankingPlaces?.[0];
      if (!subRanking) continue;

      const sum =
        (subRanking.single ?? system.amountOfLevels) +
        (subRanking.double ?? system.amountOfLevels) +
        (type === SubEventTypeEnum.MX ? (subRanking.mix ?? system.amountOfLevels) : 0);

      const higherPlayers = sortedPlayers?.filter((p) => p.sum > sum);
      if (higherPlayers) {
        for (const higherPlayer of higherPlayers) {
          warnings.push({
            message: 'all.competition.team-assembly.warnings.subtitute-team-index',
            params: { subtitute: higherPlayer },
          });
        }
      }
    }

    return { valid: true, errors: [], warnings };
  }
}
