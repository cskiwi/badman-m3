import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsTimeZone } from '@app/frontend-utils';
import { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsTimezone',
  pure: true,
  standalone: true
})
export class DayjsTimezonePipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput, timezone: DayjsTimeZone): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = this.dayjsService.parse(value);
    
    if (!this.dayjsService.isValid(date)) {
      return null;
    }

    return this.dayjsService.tz(date, timezone);
  }
}