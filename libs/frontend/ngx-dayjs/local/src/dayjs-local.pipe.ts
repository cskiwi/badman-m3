import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService } from '../../services/src/dayjs.service';
import { DayjsInput } from '../../services/src/types';
import { Dayjs } from 'dayjs';

@Pipe({
  name: 'dayjsLocal',
  pure: true,
  standalone: true
})
export class DayjsLocalPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = this.dayjsService.parse(value);
    
    if (!this.dayjsService.isValid(date)) {
      return null;
    }

    return this.dayjsService.local(date);
  }
}