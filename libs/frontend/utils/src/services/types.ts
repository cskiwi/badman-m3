import { Dayjs, ManipulateType, OpUnitType, QUnitType } from 'dayjs';

export type DayjsInput = string | number | Date | Dayjs | null | undefined;

export type DayjsFormat = string;

export type DayjsLocale = 'nl' | 'en' | 'fr';

export type DayjsTimeZone = string;

export interface NgxDayjsConfig {
  defaultLocale?: string;
  enablePlugins?: string[];
  plugins?: DayjsPlugin[];
}

export interface DayjsPlugin {
  name: string;
  plugin: unknown;
}

export type DayjsManipulateType = ManipulateType;
export type DayjsOpUnitType = OpUnitType;
export type DayjsQUnitType = QUnitType;

export interface DayjsCalendarFormat {
  sameDay?: string;
  nextDay?: string;
  nextWeek?: string;
  lastDay?: string;
  lastWeek?: string;
  sameElse?: string;
}

export type DayjsCalendarReference = DayjsInput;