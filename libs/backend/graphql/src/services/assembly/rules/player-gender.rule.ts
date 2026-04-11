import { SubEventTypeEnum } from '@app/models-enum';
import { AssemblyValidationError } from '../assembly-output';
import { PlayerWithRanking, ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class PlayerGenderRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { single1, single2, single3, single4, double1, double2, double3, double4, type } = data;
    const errors: AssemblyValidationError[] = [];

    if (type === SubEventTypeEnum.M) {
      errors.push(
        ...this.checkGender(
          [single1, single2, single3, single4, ...(double1 ?? []), ...(double2 ?? []), ...(double3 ?? []), ...(double4 ?? [])],
          'M',
        ),
      );
    } else if (type === SubEventTypeEnum.F) {
      errors.push(
        ...this.checkGender(
          [single1, single2, single3, single4, ...(double1 ?? []), ...(double2 ?? []), ...(double3 ?? []), ...(double4 ?? [])],
          'F',
        ),
      );
    } else {
      // MX
      errors.push(...this.checkGender([single1, single2, ...(double1 ?? [])], 'M'));
      errors.push(...this.checkGender([single3, single4, ...(double2 ?? [])], 'F'));

      // Mixed doubles must have M and F
      for (const [name, pair] of [['double3', double3], ['double4', double4]] as const) {
        if (pair?.[0] && pair?.[1] && pair[0].gender === pair[1].gender) {
          errors.push({
            message: 'all.v1.teamFormation.errors.player-genders',
            params: {
              game: name,
              player1: { id: pair[0].id, fullName: pair[0].fullName, gender: pair[0].gender },
              player2: { id: pair[1].id, fullName: pair[1].fullName, gender: pair[1].gender },
            },
          });
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private checkGender(players: (PlayerWithRanking | undefined)[], gender: string): AssemblyValidationError[] {
    const unique = [...new Set(players.filter(Boolean))];
    const result: AssemblyValidationError[] = [];
    for (const p of unique) {
      if (p && p.gender !== gender) {
        result.push({
          message: 'all.v1.teamFormation.errors.player-gender',
          params: { player: { id: p.id, fullName: p.fullName, gender: p.gender }, gender },
        });
      }
    }
    return result;
  }
}
