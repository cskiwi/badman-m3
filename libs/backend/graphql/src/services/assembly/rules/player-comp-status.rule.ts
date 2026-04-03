import { PlayerWithRanking, ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class PlayerCompStatusRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { single1, single2, single3, single4, double1, double2, double3, double4, subtitudes } = data;

    const errors = [];
    const allPlayers = [
      single1, single2, single3, single4,
      ...(double1 ?? []),
      ...(double2 ?? []),
      ...(double3 ?? []),
      ...(double4 ?? []),
      ...(subtitudes ?? []),
    ].filter(Boolean) as PlayerWithRanking[];

    for (const player of allPlayers) {
      if (!player.competitionPlayer) {
        errors.push({
          message: 'all.v1.teamFormation.errors.comp-status-html',
          params: { player: { id: player.id, fullName: player.fullName } },
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
