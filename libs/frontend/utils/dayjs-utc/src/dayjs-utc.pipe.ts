import { Pipe, PipeTransform, inject } from '@angular/core';
import { Dayjs } from 'dayjs';
import { DayjsInput, DayjsService } from '@app/frontend-utils';

@Pipe({
  name: 'dayjsUtc',
  pure: true,
  standalone: true,
})
export class DayjsUtcPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value?: DayjsInput): Dayjs {
    return this.dayjsService.utc(value);
  }
}
