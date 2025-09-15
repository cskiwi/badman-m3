import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsOpUnitType } from '@oncall/utils';
import dayjs from 'dayjs';

@Pipe({
  name: 'dayjsIsBefore',
  pure: true,
  standalone: true
})
export class DayjsIsBeforePipe implements PipeTransform {
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

    return date1.isBefore(date2, unit);
  }
}