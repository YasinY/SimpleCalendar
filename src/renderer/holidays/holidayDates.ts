import { DAYS_PER_WEEK } from '@renderer/constants';
import { addDays, toIsoDate } from '@renderer/date/dateUtils';
import { ALL_STATE_CODES, HOLIDAYS, HOLIDAY_RULE } from './holidayConstants';
import type { Holiday } from './holiday';

const HUMAN_MONTH_OFFSET = 1;
const WEDNESDAY_INDEX = 3;
const REPENTANCE_DAY_LATEST = { month: 11, day: 22 };

export type HolidayMap = Map<string, string[]>;

function createDate(year: number, humanMonth: number, day: number): Date {
  return new Date(year, humanMonth - HUMAN_MONTH_OFFSET, day);
}

export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return createDate(year, month, day);
}

export function getRepentanceDay(year: number): Date {
  const latestPossible = createDate(year, REPENTANCE_DAY_LATEST.month, REPENTANCE_DAY_LATEST.day);
  const daysBack = (latestPossible.getDay() - WEDNESDAY_INDEX + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  return addDays(latestPossible, -daysBack);
}

function resolveDate(holiday: Holiday, year: number, easterSunday: Date): Date {
  switch (holiday.rule) {
    case HOLIDAY_RULE.FIXED:
      return createDate(year, holiday.month, holiday.day);
    case HOLIDAY_RULE.EASTER_RELATIVE:
      return addDays(easterSunday, holiday.easterOffset);
    case HOLIDAY_RULE.REPENTANCE_DAY:
      return getRepentanceDay(year);
  }
}

function appliesTo(holiday: Holiday, stateCode: string): boolean {
  return holiday.regions === ALL_STATE_CODES || holiday.regions.includes(stateCode);
}

function addHoliday(holidaysByDate: HolidayMap, iso: string, name: string): void {
  const bucket = holidaysByDate.get(iso);
  if (bucket) {
    bucket.push(name);
    return;
  }
  holidaysByDate.set(iso, [name]);
}

export function buildHolidayMap(years: number[], stateCode: string): HolidayMap {
  const holidaysByDate: HolidayMap = new Map();
  const applicable = HOLIDAYS.filter((holiday) => appliesTo(holiday, stateCode));

  for (const year of years) {
    const easterSunday = getEasterSunday(year);
    for (const holiday of applicable) {
      addHoliday(holidaysByDate, toIsoDate(resolveDate(holiday, year, easterSunday)), holiday.name);
    }
  }

  return holidaysByDate;
}
