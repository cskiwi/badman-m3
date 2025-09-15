import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsInput, DayjsService } from '@oncall/utils';
import { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

@Pipe({
  name: 'dayjsLocal',
  pure: true,
  standalone: true,
})
export class DayjsLocalPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = this.dayjsService.parse(value) as Dayjs;

    if (!date.isValid()) {
      return null;
    }

    return date.local();
  }
}
