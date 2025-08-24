import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsFormat } from '@app/frontend-utils';
import { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsParse',
  pure: true,
  standalone: true
})
export class DayjsParsePipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput, format?: DayjsFormat): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = this.dayjsService.parse(value, format);
    
    if (!this.dayjsService.isValid(date)) {
      return null;
    }

    return date;
  }
}