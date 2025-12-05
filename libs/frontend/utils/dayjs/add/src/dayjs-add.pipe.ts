import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsManipulateType } from '@app/frontend-utils';
import dayjs, { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsAdd',
  pure: true,
  standalone: true
})
export class DayjsAddPipe implements PipeTransform {
  transform(
    value: DayjsInput,
    amount: number,
    unit: DayjsManipulateType
  ): Dayjs | null {
    if (!value || typeof amount !== 'number') {
      return null;
    }

    const date = dayjs(value);

    if (!date.isValid()) {
      return null;
    }

    return date.add(amount, unit);
  }
}