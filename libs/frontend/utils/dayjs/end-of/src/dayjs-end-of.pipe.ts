import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsOpUnitType } from '@oncall/utils';
import dayjs, { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsEndOf',
  pure: true,
  standalone: true
})
export class DayjsEndOfPipe implements PipeTransform {

  transform(value: DayjsInput, unit: DayjsOpUnitType): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = dayjs(value);

    if (!date.isValid()) {
      return null;
    }

    return date.endOf(unit);
  }
}