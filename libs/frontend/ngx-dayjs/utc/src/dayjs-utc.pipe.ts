import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService } from '../../services/src/dayjs.service';
import { DayjsInput } from '../../services/src/types';
import { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsUtc',
  pure: true,
  standalone: true
})
export class DayjsUtcPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value?: DayjsInput): Dayjs {
    return this.dayjsService.utc(value);
  }
}