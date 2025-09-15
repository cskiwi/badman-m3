import { Injectable, inject } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import { DayjsLocaleService } from './dayjs-locale.service';
import {
  DayjsCalendarReference,
  DayjsFormat,
  DayjsInput,
  DayjsLocale,
} from './types';

// Load essential plugins
dayjs.extend(calendar);
dayjs.extend(relativeTime);
dayjs.extend(customParseFormat);

@Injectable({
  providedIn: 'root',
})
export class DayjsService {
  private readonly localeService = inject(DayjsLocaleService);

  // Core parsing
  parse(input: DayjsInput, format?: DayjsFormat): Dayjs {
    if (!input) {
      return dayjs();
    }

    if (format) {
      return dayjs(input, format);
    }

    return dayjs(input);
  }

  // Formatting
  format(
    date: Dayjs,
    format: DayjsFormat = 'MMM D, YYYY',
    locale?: DayjsLocale,
  ): string {
    if (!date.isValid()) {
      return '';
    }

    if (locale) {
      return date.locale(locale).format(format);
    }

    return date.locale(this.localeService.getLocale()).format(format);
  }

  // Relative time
  fromNow(date: Dayjs, withoutSuffix = false): string {
    if (!date.isValid()) {
      return '';
    }

    return date.locale(this.localeService.getLocale()).fromNow(withoutSuffix);
  }

  // Calendar time
  calendar(date: Dayjs, reference?: DayjsCalendarReference): string {
    if (!date.isValid()) {
      return '';
    }

    const calendarDate = date.locale(this.localeService.getLocale());

    if (reference) {
      return calendarDate.calendar(dayjs(reference));
    }

    return calendarDate.calendar();
  }
}
