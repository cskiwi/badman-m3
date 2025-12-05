import { Pipe, PipeTransform, inject } from '@angular/core';
import {
  DayjsService,
  DayjsInput,
  DayjsCalendarReference,
} from '@app/frontend-utils';
import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';

dayjs.extend(calendar);

@Pipe({
  name: 'dayjsCalendar',
  pure: true,
  standalone: true,
})
export class DayjsCalendarPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput, reference?: DayjsCalendarReference): string {
    if (!value) {
      return '';
    }

    const date = this.dayjsService.parse(value);

    if (!date.isValid()) {
      return '';
    }

    return date.calendar(reference);
  }
}
