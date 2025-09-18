import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsTimeZone } from '@app/frontend-utils';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(timezone);

@Pipe({
  name: 'dayjsTimezone',
  pure: true,
  standalone: true,
})
export class DayjsTimezonePipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput, timezone: DayjsTimeZone): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = this.dayjsService.parse(value);

    if (!date.isValid()) {
      return null;
    }

    return date.tz(timezone);
  }
}
