import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService } from '../../services/src/dayjs.service';
import { DayjsInput } from '../../services/src/types';

@Pipe({
  name: 'dayjsIsValid',
  pure: true,
  standalone: true
})
export class DayjsIsValidPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput): boolean {
    if (!value) {
      return false;
    }

    const date = this.dayjsService.parse(value);
    return this.dayjsService.isValid(date);
  }
}