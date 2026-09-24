import {
  DAY_SUFFIX,
  DAYS_PER_WEEK,
  FIRST_MONTH_DAY,
  MAX_DURATION_STEPS,
  MINUTES_PER_HOUR,
  MONTH_NAMES,
  WEEKDAY_NAMES
} from '../constants';
import type { DayColumnLayout } from './dayColumnLayout';
import type { MonthCell } from './monthCell';
import type { MonthGrid } from './monthGrid';
import type { TimedEvent } from './timedEvent';
import type { DateRange } from '../../shared/dateRange';

const ISO_DATE_PAD = 2;
const PAD_CHARACTER = '0';
const ISO_SEPARATOR = '-';
const TIME_SEPARATOR = ':';
const MONTH_OFFSET = 1;
const SUNDAY_INDEX = 0;
const MONDAY_BASED_SHIFT = 6;
const NO_DURATION = 0;
const LAST_DAY_OFFSET = 1;
const WEEKDAY_SEPARATOR = ', ';
const DATE_PART_SEPARATOR = ' ';

interface MonthGridBounds {
  monthStart: Date;
  gridStart: Date;
  dayCount: number;
}

function pad(value: number): string {
  return String(value).padStart(ISO_DATE_PAD, PAD_CHARACTER);
}

export function toIsoDate(date: Date): string {
  return [date.getFullYear(), pad(date.getMonth() + MONTH_OFFSET), pad(date.getDate())].join(ISO_SEPARATOR);
}

export function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split(ISO_SEPARATOR).map(Number);
  return new Date(year, month - MONTH_OFFSET, day);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), FIRST_MONTH_DAY);
}

export function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, FIRST_MONTH_DAY);
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + MONTH_OFFSET, SUNDAY_INDEX).getDate();
}

export function getWeekdayIndex(date: Date): number {
  return (date.getDay() + MONDAY_BASED_SHIFT) % DAYS_PER_WEEK;
}

export function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -getWeekdayIndex(date));
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: DAYS_PER_WEEK }, (_unused, offset) => addDays(weekStart, offset));
}

export function formatWeekdayDate(date: Date): string {
  const dayLabel = [date.getDate() + DAY_SUFFIX, MONTH_NAMES[date.getMonth()]].join(DATE_PART_SEPARATOR);
  return WEEKDAY_NAMES[getWeekdayIndex(date)] + WEEKDAY_SEPARATOR + dayLabel;
}

export function formatLongDate(date: Date): string {
  return [formatWeekdayDate(date), date.getFullYear()].join(DATE_PART_SEPARATOR);
}

export function getMonthTitle(date: Date): { month: string; year: string } {
  return { month: MONTH_NAMES[date.getMonth()], year: String(date.getFullYear()) };
}

function getMonthGridBounds(reference: Date): MonthGridBounds {
  const monthStart = startOfMonth(reference);
  const leadingDays = getWeekdayIndex(monthStart);
  const weekCount = Math.ceil((leadingDays + getDaysInMonth(monthStart)) / DAYS_PER_WEEK);
  return { monthStart, gridStart: addDays(monthStart, -leadingDays), dayCount: weekCount * DAYS_PER_WEEK };
}

export function toDateRange(start: Date, end: Date): DateRange {
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

export function getMonthGridRange(reference: Date): DateRange {
  const { gridStart, dayCount } = getMonthGridBounds(reference);
  return toDateRange(gridStart, addDays(gridStart, dayCount - LAST_DAY_OFFSET));
}

export function buildMonthGrid(reference: Date, today: Date): MonthGrid {
  const { monthStart, gridStart, dayCount } = getMonthGridBounds(reference);
  const todayIso = toIsoDate(today);
  const cells: MonthCell[] = [];
  const years = new Set<number>();

  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = addDays(gridStart, offset);
    const iso = toIsoDate(date);
    years.add(date.getFullYear());
    cells.push({
      iso,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: iso === todayIso
    });
  }

  return { cells, weekCount: dayCount / DAYS_PER_WEEK, years: [...years] };
}

export function buildDayColumns(dates: Date[], today: Date): DayColumnLayout {
  const todayIso = toIsoDate(today);
  const columns = dates.map((date) => {
    const iso = toIsoDate(date);
    return {
      iso,
      dayNumber: date.getDate(),
      weekdayIndex: getWeekdayIndex(date),
      isToday: iso === todayIso
    };
  });
  const years = [...new Set(dates.map((date) => date.getFullYear()))];
  return { columns, years };
}

export function sortByTime<T extends { time: string }>(events: T[]): T[] {
  return [...events].sort((first, second) => first.time.localeCompare(second.time));
}

export function toMinutesOfDay(time: string): number {
  const [hours, minutes] = time.split(TIME_SEPARATOR).map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

export function formatMinutesOfDay(minutes: number): string {
  return pad(Math.floor(minutes / MINUTES_PER_HOUR)) + TIME_SEPARATOR + pad(minutes % MINUTES_PER_HOUR);
}

export function getMinutesOfDay(date: Date): number {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}

export function getDurationMinutes(event: TimedEvent): number {
  if (!event.endTime) return NO_DURATION;
  return Math.max(NO_DURATION, toMinutesOfDay(event.endTime) - toMinutesOfDay(event.time));
}

export function getDurationSteps(event: TimedEvent): number {
  const steps = Math.ceil(getDurationMinutes(event) / MINUTES_PER_HOUR);
  return Math.min(MAX_DURATION_STEPS, steps);
}
