import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsOpUnitType } from '@app/frontend-utils';
import dayjs, { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsStartOf',
  pure: true,
  standalone: true
})
export class DayjsStartOfPipe implements PipeTransform {

  transform(value: DayjsInput, unit: DayjsOpUnitType): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = dayjs(value);

    if (!date.isValid()) {
      return null;
    }

    return date.startOf(unit);
  }
}