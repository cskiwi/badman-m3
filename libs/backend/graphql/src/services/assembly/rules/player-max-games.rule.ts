import { SubEventTypeEnum } from '@app/models-enum';
import { AssemblyValidationError } from '../assembly-output';
import { PlayerWithRanking, ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class PlayerMaxGamesRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { single1, single2, single3, single4, double1, double2, double3, double4, type } = data;
    const errors: AssemblyValidationError[] = [];

    // Check max 1 single game per player
    const singlePlayers = [single1, single2, single3, single4].filter(Boolean) as PlayerWithRanking[];
    const uniqueSingleIds = [...new Set(singlePlayers.map((p) => p.id))];
    for (const id of uniqueSingleIds) {
      if (singlePlayers.filter((p) => p.id === id).length > 1) {
        const player = singlePlayers.find((p) => p.id === id)!;
        errors.push({
          message: 'all.v1.teamFormation.errors.player-max-single-games',
          params: { player: { id: player.id, fullName: player.fullName }, max: 1 },
        });
      }
    }

    if (type === SubEventTypeEnum.MX) {
      const doublePlayers = [...(double1 ?? []), ...(double2 ?? [])].filter(Boolean);
      const mixedPlayers = [...(double3 ?? []), ...(double4 ?? [])].filter(Boolean);

      // Max 1 mixed per player
      const uniqueMix = [...new Set(mixedPlayers.map((p) => p.id))];
      for (const id of uniqueMix) {
        if (mixedPlayers.filter((p) => p.id === id).length > 1) {
          const player = mixedPlayers.find((p) => p.id === id)!;
          errors.push({
            message: 'all.v1.teamFormation.errors.player-max-mix-games',
            params: { player: { id: player.id, fullName: player.fullName }, max: 1 },
          });
        }
      }

      // Max 2 doubles per player
      const uniqueDoubles = [...new Set(doublePlayers.map((p) => p.id))];
      for (const id of uniqueDoubles) {
        if (doublePlayers.filter((p) => p.id === id).length > 2) {
          const player = doublePlayers.find((p) => p.id === id)!;
          errors.push({
            message: 'all.v1.teamFormation.errors.player-max-double-games',
            params: { player: { id: player.id, fullName: player.fullName }, max: 2 },
          });
        }
      }
    } else {
      const doublePlayers = [...(double1 ?? []), ...(double2 ?? []), ...(double3 ?? []), ...(double4 ?? [])].filter(Boolean);
      const uniqueDoubles = [...new Set(doublePlayers.map((p) => p.id))];
      for (const id of uniqueDoubles) {
        if (doublePlayers.filter((p) => p.id === id).length > 2) {
          const player = doublePlayers.find((p) => p.id === id)!;
          errors.push({
            message: 'all.v1.teamFormation.errors.player-max-double-games',
            params: { player: { id: player.id, fullName: player.fullName }, max: 2 },
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
