import { ValidationData, ValidationResult } from '../assembly-validation.types';

export abstract class Rule {
  abstract validate(data: ValidationData): Promise<ValidationResult>;
}
