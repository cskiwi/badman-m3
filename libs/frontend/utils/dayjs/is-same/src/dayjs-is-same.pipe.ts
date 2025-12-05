import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsOpUnitType } from '@app/frontend-utils';
import dayjs from 'dayjs';

@Pipe({
  name: 'dayjsIsSame',
  pure: true,
  standalone: true
})
export class DayjsIsSamePipe implements PipeTransform {

  transform(
    value: DayjsInput,
    compareValue: DayjsInput,
    unit?: DayjsOpUnitType
  ): boolean {
    if (!value || !compareValue) {
      return false;
    }

    const date1 = dayjs(value);
    const date2 = dayjs(compareValue);

    if (!date1.isValid() || !date2.isValid()) {
      return false;
    }

    return date1.isSame(date2, unit);
  }
}