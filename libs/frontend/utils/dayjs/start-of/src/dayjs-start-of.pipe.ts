import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsOpUnitType } from '@app/frontend-utils';
import { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsStartOf',
  pure: true,
  standalone: true
})
export class DayjsStartOfPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput, unit: DayjsOpUnitType): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = this.dayjsService.parse(value);
    
    if (!this.dayjsService.isValid(date)) {
      return null;
    }

    return this.dayjsService.startOf(date, unit);
  }
}