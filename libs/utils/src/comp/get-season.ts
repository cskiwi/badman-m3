import dayjs from 'dayjs';
import { Dayjs } from 'dayjs';
export const getSeasonPeriod = (season?: number) => {
  if (!season) {
    season = getSeason();
  }
  return [`${season}-09-01`, `${season + 1}-04-30`] as const;
};

export const getSeason = (inputDate?: Date | Dayjs) => {
  let date = dayjs(inputDate);
  if (!date.isValid()) {
    date = dayjs();
  }
  return date.month() >= 4 ? date.year() : date.year() - 1;
};

export const getNextSeason = (inputDate?: Date | Dayjs) => {
  let date = dayjs(inputDate);
  if (!date.isValid()) {
    date = dayjs();
  }
  return date.month() >= 9 ? date.year() + 1 : date.year();
};

export const startOfSeason = (season: number) => {
  return dayjs(`${season}-07-01`);
};

export const endOfSeason = (season: number) => {
  return dayjs(`${season + 1}-06-01`).endOf('month');
};
