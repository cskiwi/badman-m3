import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsManipulateType } from '@oncall/utils';
import dayjs, { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsSubtract',
  pure: true,
  standalone: true
})
export class DayjsSubtractPipe implements PipeTransform {
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

    return date.subtract(amount, unit);
  }
}