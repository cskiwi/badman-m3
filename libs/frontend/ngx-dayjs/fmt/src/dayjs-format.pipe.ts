import { Pipe, PipeTransform, inject } from '@angular/core';
import { DayjsService } from '../../services/src/dayjs.service';
import { DayjsInput, DayjsFormat, DayjsLocale } from '../../services/src/types';

@Pipe({
  name: 'dayjsFormat',
  pure: true,
  standalone: true
})
export class DayjsFormatPipe implements PipeTransform {
  private readonly dayjsService = inject(DayjsService);

  transform(
    value: DayjsInput,
    format: DayjsFormat,
    locale?: DayjsLocale
  ): string {
    if (!value) {
      return '';
    }

    const date = this.dayjsService.parse(value);
    
    if (!this.dayjsService.isValid(date)) {
      return '';
    }

    return this.dayjsService.format(date, format, locale);
  }
}