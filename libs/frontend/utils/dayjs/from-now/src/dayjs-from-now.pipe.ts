import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput } from '@app/frontend-utils';

@Pipe({
  name: 'dayjsFromNow',
  pure: true,
  standalone: true
})
export class DayjsFromNowPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(value: DayjsInput, withoutSuffix = false): string {
    if (!value) {
      return '';
    }

    const date = this.dayjsService.parse(value);
    
    if (!this.dayjsService.isValid(date)) {
      return '';
    }

    return this.dayjsService.fromNow(date, withoutSuffix);
  }
}