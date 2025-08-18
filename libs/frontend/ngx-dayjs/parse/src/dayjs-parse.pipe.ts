import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService } from '../../services/src/dayjs.service';
import { DayjsInput, DayjsFormat } from '../../services/src/types';
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