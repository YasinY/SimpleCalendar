import { DAY_SUFFIX, DAYS_PER_WEEK, DEFAULT_VIEW_MODE, MONTH_NAMES, VIEW_MODES } from '@renderer/constants';
import {
  addDays,
  addMonths,
  formatWeekdayDate,
  getMonthGridRange,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateRange
} from './dateUtils';
import type { ViewTitle } from './viewTitle';
import type { DateRange } from '@shared/dateRange';
import type { ViewMode } from '@shared/viewMode';

const RANGE_SEPARATOR = ' – ';
const LAST_WEEK_DAY_OFFSET = DAYS_PER_WEEK - 1;

export interface ViewModeConfig {
  normalize(date: Date): Date;
  shift(date: Date, step: number): Date;
  buildTitle(date: Date): ViewTitle;
  contains(reference: Date, date: Date): boolean;
  range(date: Date): DateRange;
}

function sameDay(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();
}

function sameMonth(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth();
}

function withinWeek(weekStart: Date, date: Date): boolean {
  const day = startOfDay(date);
  return day >= weekStart && day < addDays(weekStart, DAYS_PER_WEEK);
}

function monthTitle(date: Date): ViewTitle {
  return { main: MONTH_NAMES[date.getMonth()], year: String(date.getFullYear()) };
}

function weekTitle(weekStart: Date): ViewTitle {
  const weekEnd = addDays(weekStart, LAST_WEEK_DAY_OFFSET);
  const startDay = weekStart.getDate() + DAY_SUFFIX;
  const endDay = weekEnd.getDate() + DAY_SUFFIX + ' ' + MONTH_NAMES[weekEnd.getMonth()];
  const startLabel = sameMonth(weekStart, weekEnd) ? startDay : startDay + ' ' + MONTH_NAMES[weekStart.getMonth()];
  return { main: startLabel + RANGE_SEPARATOR + endDay, year: String(weekEnd.getFullYear()) };
}

function dayTitle(date: Date): ViewTitle {
  return { main: formatWeekdayDate(date), year: String(date.getFullYear()) };
}

export const VIEW_MODE_CONFIG: Record<ViewMode, ViewModeConfig> = {
  [VIEW_MODES.MONTH]: {
    normalize: startOfMonth,
    shift: addMonths,
    buildTitle: monthTitle,
    contains: sameMonth,
    range: getMonthGridRange
  },
  [VIEW_MODES.WEEK]: {
    normalize: startOfWeek,
    shift: (date, step) => addDays(date, step * DAYS_PER_WEEK),
    buildTitle: weekTitle,
    contains: withinWeek,
    range: (weekStart) => toDateRange(weekStart, addDays(weekStart, LAST_WEEK_DAY_OFFSET))
  },
  [VIEW_MODES.DAY]: {
    normalize: startOfDay,
    shift: addDays,
    buildTitle: dayTitle,
    contains: sameDay,
    range: (date) => toDateRange(date, date)
  }
};

export function resolveViewMode(value: string | undefined): ViewMode {
  return value !== undefined && value in VIEW_MODE_CONFIG ? (value as ViewMode) : DEFAULT_VIEW_MODE;
}
