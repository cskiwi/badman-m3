import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput, DayjsFormat } from '@app/frontend-utils';
import dayjs, { Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

@Pipe({
  name: 'dayjsParse',
  pure: true,
  standalone: true,
})
export class DayjsParsePipe implements PipeTransform {
  transform(value: DayjsInput, format?: DayjsFormat): Dayjs | null {
    if (!value) {
      return null;
    }

    const date = dayjs(value, format);

    if (!date.isValid()) {
      return null;
    }

    return date;
  }
}
