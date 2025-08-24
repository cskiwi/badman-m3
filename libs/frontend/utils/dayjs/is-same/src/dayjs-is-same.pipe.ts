import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsOpUnitType } from '@app/frontend-utils';

@Pipe({
  name: 'dayjsIsSame',
  pure: true,
  standalone: true
})
export class DayjsIsSamePipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(
    value: DayjsInput,
    compareValue: DayjsInput,
    unit?: DayjsOpUnitType
  ): boolean {
    if (!value || !compareValue) {
      return false;
    }

    const date1 = this.dayjsService.parse(value);
    const date2 = this.dayjsService.parse(compareValue);
    
    if (!this.dayjsService.isValid(date1) || !this.dayjsService.isValid(date2)) {
      return false;
    }

    return this.dayjsService.isSame(date1, date2, unit);
  }
}