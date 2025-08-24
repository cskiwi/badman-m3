import { Injectable, inject } from '@angular/core';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import calendar from 'dayjs/plugin/calendar';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import { 
  DayjsInput, 
  DayjsFormat, 
  DayjsLocale, 
  DayjsTimeZone,
  DayjsManipulateType,
  DayjsOpUnitType,
  DayjsQUnitType,
  DayjsCalendarReference
} from './types';
import { DayjsLocaleService } from './dayjs-locale.service';

// Load essential plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.extend(customParseFormat);

@Injectable({
  providedIn: 'root'
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
  format(date: Dayjs, format: DayjsFormat = 'MMM D, YYYY', locale?: DayjsLocale): string {
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

  // Date manipulation
  add(date: Dayjs, value: number, unit: DayjsManipulateType): Dayjs {
    return date.add(value, unit);
  }

  subtract(date: Dayjs, value: number, unit: DayjsManipulateType): Dayjs {
    return date.subtract(value, unit);
  }

  startOf(date: Dayjs, unit: DayjsOpUnitType): Dayjs {
    return date.startOf(unit);
  }

  endOf(date: Dayjs, unit: DayjsOpUnitType): Dayjs {
    return date.endOf(unit);
  }

  // Date comparison
  diff(date1: Dayjs, date2: Dayjs, unit?: DayjsQUnitType, precise?: boolean): number {
    return date1.diff(date2, unit, precise);
  }

  isBefore(date1: Dayjs, date2: Dayjs, unit?: DayjsOpUnitType): boolean {
    return date1.isBefore(date2, unit);
  }

  isAfter(date1: Dayjs, date2: Dayjs, unit?: DayjsOpUnitType): boolean {
    return date1.isAfter(date2, unit);
  }

  isSame(date1: Dayjs, date2: Dayjs, unit?: DayjsOpUnitType): boolean {
    return date1.isSame(date2, unit);
  }

  // Validation
  isValid(date: Dayjs): boolean {
    return date.isValid();
  }

  // Timezone operations
  tz(date: Dayjs, timezone: DayjsTimeZone): Dayjs {
    return date.tz(timezone);
  }

  utc(date?: DayjsInput): Dayjs {
    return dayjs.utc(date);
  }

  local(date: Dayjs): Dayjs {
    return date.local();
  }

  // Get current date/time
  now(): Dayjs {
    return dayjs();
  }

  // Clone date
  clone(date: Dayjs): Dayjs {
    return date.clone();
  }

  // Get unix timestamp
  unix(date: Dayjs): number {
    return date.unix();
  }

  valueOf(date: Dayjs): number {
    return date.valueOf();
  }

  // Date getters
  year(date: Dayjs): number {
    return date.year();
  }

  month(date: Dayjs): number {
    return date.month();
  }

  date(date: Dayjs): number {
    return date.date();
  }

  day(date: Dayjs): number {
    return date.day();
  }

  hour(date: Dayjs): number {
    return date.hour();
  }

  minute(date: Dayjs): number {
    return date.minute();
  }

  second(date: Dayjs): number {
    return date.second();
  }

  millisecond(date: Dayjs): number {
    return date.millisecond();
  }
}