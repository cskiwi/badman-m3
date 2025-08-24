import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsCalendarReference } from '@app/frontend-utils';

@Pipe({
  name: 'dayjsCalendar',
  pure: true,
  standalone: true
})
export class DayjsCalendarPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput, reference?: DayjsCalendarReference): string {
    if (!value) {
      return '';
    }

    const date = this.dayjsService.parse(value);
    
    if (!this.dayjsService.isValid(date)) {
      return '';
    }

    return this.dayjsService.calendar(date, reference);
  }
}