import { SubEventTypeEnum } from '@app/models-enum';
import { AssemblyValidationError } from '../assembly-output';
import { PlayerWithRanking, ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class PlayerMinLevelRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { system, team, meta, single1, single2, single3, single4, double1, double2, double3, double4, subtitudes, type, subEvent } = data;
    const errors: AssemblyValidationError[] = [];

    if (!system?.amountOfLevels || !subEvent?.maxLevel) return { valid: true, errors };
    if (team?.teamNumber === 1) return { valid: true, errors };

    const uniquePlayers = [
      ...new Set(
        [
          single1, single2, single3, single4,
          ...(double1 ?? []), ...(double2 ?? []), ...(double3 ?? []), ...(double4 ?? []),
          ...(subtitudes ?? []),
        ].filter(Boolean),
      ),
    ] as PlayerWithRanking[];

    for (const player of uniquePlayers) {
      const ranking = player.rankingPlaces?.[0];
      if (!ranking) continue;

      const metaPlayer = meta?.competition?.players?.find((p) => p.id === player.id);
      const hasException = metaPlayer?.levelException || metaPlayer?.levelExceptionGiven;

      const single = ranking.single ?? system.amountOfLevels;
      const double = ranking.double ?? system.amountOfLevels;
      const mix = ranking.mix ?? system.amountOfLevels;

      if (single < subEvent.maxLevel && !hasException) {
        errors.push({
          message: 'all.v1.teamFormation.errors.player-min-level',
          params: { player: { id: player.id, fullName: player.fullName, ranking: single }, minLevel: subEvent.maxLevel, rankingType: 'single' },
        });
      }
      if (double < subEvent.maxLevel && !hasException) {
        errors.push({
          message: 'all.v1.teamFormation.errors.player-min-level',
          params: { player: { id: player.id, fullName: player.fullName, ranking: double }, minLevel: subEvent.maxLevel, rankingType: 'double' },
        });
      }
      if (type === SubEventTypeEnum.MX && mix < subEvent.maxLevel && !hasException) {
        errors.push({
          message: 'all.v1.teamFormation.errors.player-min-level',
          params: { player: { id: player.id, fullName: player.fullName, ranking: mix }, minLevel: subEvent.maxLevel, rankingType: 'mix' },
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
