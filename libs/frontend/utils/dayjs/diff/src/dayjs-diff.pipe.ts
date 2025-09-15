import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsQUnitType } from '@oncall/utils';
import dayjs from 'dayjs';

@Pipe({
  name: 'dayjsDiff',
  pure: true,
  standalone: true
})
export class DayjsDiffPipe implements PipeTransform {

  transform(
    value: DayjsInput,
    compareValue: DayjsInput,
    unit?: DayjsQUnitType,
    precise?: boolean
  ): number | null {
    if (!value || !compareValue) {
      return null;
    }

    const date1 = dayjs(value);
    const date2 = dayjs(compareValue);

    if (!date1.isValid() || !date2.isValid()) {
      return null;
    }

    return date1.diff(date2, unit, precise);
  }
}