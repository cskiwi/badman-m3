import { Standing } from '@app/models';
import { AssemblyValidationError } from '../assembly-output';
import { ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class TeamSubeventIndexRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { teamIndex, subEvent, previousSeasonTeam, team } = data;

    if (!subEvent?.minBaseIndex) return { valid: true, errors: [] };

    // If team was degraded, allow lower index
    const previousEntry = previousSeasonTeam?.entries?.[0];
    const standing = previousEntry?.standing as Standing | undefined;
    if (standing?.faller) return { valid: true, errors: [] };

    // Only check first team
    if (team?.teamNumber !== 1) return { valid: true, errors: [] };

    if ((teamIndex ?? 0) < subEvent.minBaseIndex) {
      return {
        valid: false,
        errors: [
          {
            message: 'all.v1.teamFormation.errors.team-to-strong',
            params: { teamIndex, minIndex: subEvent.minBaseIndex, maxIndex: subEvent.maxBaseIndex },
          } as AssemblyValidationError,
        ],
      };
    }

    return { valid: true, errors: [] };
  }
}
