import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsManipulateType } from '@app/frontend-utils';
import { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsSubtract',
  pure: true,
  standalone: true
})
export class DayjsSubtractPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(
    value: DayjsInput,
    amount: number,
    unit: DayjsManipulateType
  ): Dayjs | null {
    if (!value || typeof amount !== 'number') {
      return null;
    }

    const date = this.dayjsService.parse(value);
    
    if (!this.dayjsService.isValid(date)) {
      return null;
    }

    return this.dayjsService.subtract(date, amount, unit);
  }
}