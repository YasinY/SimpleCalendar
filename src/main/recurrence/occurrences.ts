import { addDays, addMonthsKeepingDay, daysBetween, fromIsoDate, shiftIsoDate, toIsoDate } from '@shared/isoDate';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { DateRange } from '@shared/dateRange';
import type { Recurrence } from '@shared/recurrence';
import type { RecurrenceFrequency } from '@shared/recurrenceFrequency';

const DAYS_PER_WEEK = 7;
const MONTHS_PER_YEAR = 12;
const NO_SPAN = 0;
const FIRST_OCCURRENCE = 0;
const SINGLE_STEP = 1;

export type OccurrenceSeries = Pick<CalendarEvent, 'date' | 'endDate' | 'recurrence'>;

const SHIFT_BY_FREQUENCY: Record<RecurrenceFrequency, (start: Date, steps: number) => Date> = {
  daily: (start, steps) => addDays(start, steps),
  weekly: (start, steps) => addDays(start, steps * DAYS_PER_WEEK),
  monthly: (start, steps) => addMonthsKeepingDay(start, steps),
  yearly: (start, steps) => addMonthsKeepingDay(start, steps * MONTHS_PER_YEAR)
};

function singleOccurrenceRule(date: string): Recurrence {
  return { frequency: 'daily', interval: SINGLE_STEP, until: date };
}

function earlierIso(first: string, second: string): string {
  return first < second ? first : second;
}

export function spanDays({ date, endDate }: OccurrenceSeries): number {
  return endDate === null ? NO_SPAN : daysBetween(date, endDate);
}

export function expandOccurrences(series: OccurrenceSeries, { from, to }: DateRange, skipped: ReadonlySet<string>): string[] {
  const rule = series.recurrence ?? singleOccurrenceRule(series.date);
  const lastStart = rule.until === null ? to : earlierIso(rule.until, to);
  const span = spanDays(series);
  const start = fromIsoDate(series.date);
  const shift = SHIFT_BY_FREQUENCY[rule.frequency];
  const occurrences: string[] = [];

  for (let index = FIRST_OCCURRENCE; ; index += 1) {
    const occurrence = toIsoDate(shift(start, index * rule.interval));
    if (occurrence > lastStart) return occurrences;
    if (skipped.has(occurrence) || shiftIsoDate(occurrence, span) < from) continue;
    occurrences.push(occurrence);
  }
}
