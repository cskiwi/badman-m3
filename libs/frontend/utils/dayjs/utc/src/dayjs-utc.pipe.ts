import { Pipe, PipeTransform, inject } from '@angular/core';
import { Dayjs } from 'dayjs';
import { DayjsInput, DayjsService } from '@oncall/utils';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@Pipe({
  name: 'dayjsUtc',
  pure: true,
  standalone: true,
})
export class DayjsUtcPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = this.dayjsService.parse(value) as Dayjs;

    if (!date.isValid()) {
      return null;
    }

    return date.utc();
  }
}
