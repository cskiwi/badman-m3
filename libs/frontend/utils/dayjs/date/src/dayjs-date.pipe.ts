import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService, DayjsInput, DayjsFormat, DayjsLocale } from '@oncall/utils';

@Pipe({
  name: 'dayjsDate',
  pure: true,
  standalone: true
})
export class DayjsDatePipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(
    value: DayjsInput,
    format: DayjsFormat = 'MMM D, YYYY',
    locale?: DayjsLocale
  ): string {
    if (!value) {
      return '';
    }

    const date = this.dayjsService.parse(value);
    
    if (!date.isValid()) {
      return '';
    }

    return this.dayjsService.format(date, format, locale);
  }
}