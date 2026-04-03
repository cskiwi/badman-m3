import { AssemblyValidationError } from '../assembly-output';
import { ValidationData, ValidationResult } from '../assembly-validation.types';
import { Rule } from './_rule.base';

export class TeamBaseIndexRule extends Rule {
  async validate(data: ValidationData): Promise<ValidationResult> {
    const { team, teamIndex, meta } = data;

    if (team?.teamNumber !== 1 && (teamIndex ?? 0) < (meta?.competition?.teamIndex ?? 0)) {
      return {
        valid: false,
        errors: [
          {
            message: 'all.v1.teamFormation.errors.team-index',
            params: { teamIndex, baseIndex: meta?.competition?.teamIndex },
          } as AssemblyValidationError,
        ],
      };
    }

    return { valid: true, errors: [] };
  }
}
