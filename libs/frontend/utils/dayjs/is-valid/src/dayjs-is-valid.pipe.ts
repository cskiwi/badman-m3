import { Pipe, PipeTransform } from '@angular/core';
import { DayjsInput } from '@oncall/utils';
import dayjs from 'dayjs';

@Pipe({
  name: 'dayjsIsValid',
  pure: true,
  standalone: true
})
export class DayjsIsValidPipe implements PipeTransform {

  transform(value: DayjsInput): boolean {
    if (!value) {
      return false;
    }

    const date = dayjs(value);
    return date.isValid();
  }
}