import { AssemblyValidationError } from '../assembly-output';
import { PlayerWithRanking, ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class TeamClubBaseRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { otherMeta, single1, single2, single3, single4, double1, double2, double3, double4, subtitudes } = data;
    const errors: AssemblyValidationError[] = [];
    const warnings: AssemblyValidationError[] = [];

    const playersError = [
      ...new Set(
        [single1, single2, single3, single4, ...(double1 ?? []), ...(double2 ?? []), ...(double3 ?? []), ...(double4 ?? [])]
          .filter(Boolean) as PlayerWithRanking[],
      ),
    ];
    const playersWarn = [...new Set([...(subtitudes ?? [])].filter(Boolean))];

    for (const oMeta of otherMeta ?? []) {
      const metaPlayers = (oMeta?.competition?.players?.map((p) => p.id) ?? []) as string[];
      errors.push(...this.checkGroup(playersError, metaPlayers));
      warnings.push(...this.checkGroup(playersWarn, metaPlayers));
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private checkGroup(players: PlayerWithRanking[], otherPlayers: string[]): AssemblyValidationError[] {
    const result: AssemblyValidationError[] = [];
    for (const player of players) {
      if (otherPlayers.includes(player.id)) {
        result.push({
          message: 'all.v1.teamFormation.errors.club-base-other-team',
          params: { player: { id: player.id, fullName: player.fullName } },
        });
      }
    }
    return result;
  }
}
