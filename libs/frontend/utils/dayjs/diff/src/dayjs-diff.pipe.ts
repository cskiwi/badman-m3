import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsQUnitType } from '@app/frontend-utils';

@Pipe({
  name: 'dayjsDiff',
  pure: true,
  standalone: true
})
export class DayjsDiffPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(
    value: DayjsInput,
    compareValue: DayjsInput,
    unit?: DayjsQUnitType,
    precise?: boolean
  ): number | null {
    if (!value || !compareValue) {
      return null;
    }

    const date1 = this.dayjsService.parse(value);
    const date2 = this.dayjsService.parse(compareValue);
    
    if (!this.dayjsService.isValid(date1) || !this.dayjsService.isValid(date2)) {
      return null;
    }

    return this.dayjsService.diff(date1, date2, unit, precise);
  }
}