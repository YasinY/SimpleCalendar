import { describe, expect, it } from 'vitest';
import { expandOccurrences, spanDays, type OccurrenceSeries } from '@main/recurrence/occurrences';
import type { DateRange } from '@shared/dateRange';
import type { Recurrence } from '@shared/recurrence';
import type { RecurrenceFrequency } from '@shared/recurrenceFrequency';

const NOTHING_SKIPPED: ReadonlySet<string> = new Set();
const SINGLE_STEP = 1;
const TWO_STEPS = 2;
const THREE_STEPS = 3;
const NO_SPAN = 0;
const TWO_DAYS = 2;
const SEPTEMBER: DateRange = { from: '2026-09-01', to: '2026-09-30' };
const FIRST_WEEK: DateRange = { from: '2026-09-01', to: '2026-09-07' };
const SEPTEMBER_FIRST = '2026-09-01';
const SEPTEMBER_SECOND = '2026-09-02';
const SEPTEMBER_THIRD = '2026-09-03';
const SEPTEMBER_FIFTH = '2026-09-05';
const SEPTEMBER_SIXTH = '2026-09-06';
const SEPTEMBER_SEVENTH = '2026-09-07';
const AUGUST_THIRTIETH = '2026-08-30';
const AUGUST_TWENTIETH = '2026-08-20';
const OCTOBER_FIRST = '2026-10-01';
const OCTOBER_TENTH = '2026-10-10';

function recurrence(frequency: RecurrenceFrequency, interval = SINGLE_STEP, until: string | null = null): Recurrence {
  return { frequency, interval, until };
}

function series(date: string, rule: Recurrence | null = null, endDate: string | null = null): OccurrenceSeries {
  return { date, endDate, recurrence: rule };
}

describe('spanDays', () => {
  it('is zero for a single day event', () => {
    expect(spanDays(series(SEPTEMBER_FIRST))).toBe(NO_SPAN);
  });

  it('counts the days between start and end date', () => {
    expect(spanDays(series(SEPTEMBER_FIRST, null, SEPTEMBER_THIRD))).toBe(TWO_DAYS);
  });
});

describe('expandOccurrences', () => {
  it('returns a non-recurring event inside the range once', () => {
    expect(expandOccurrences(series(SEPTEMBER_THIRD), SEPTEMBER, NOTHING_SKIPPED)).toEqual([SEPTEMBER_THIRD]);
  });

  it('returns nothing for a non-recurring event before the range', () => {
    expect(expandOccurrences(series(AUGUST_TWENTIETH), SEPTEMBER, NOTHING_SKIPPED)).toEqual([]);
  });

  it('includes a multi-day event that starts before the range but overlaps its start', () => {
    const multiDay = series(AUGUST_THIRTIETH, null, SEPTEMBER_FIRST);

    expect(expandOccurrences(multiDay, SEPTEMBER, NOTHING_SKIPPED)).toEqual([AUGUST_THIRTIETH]);
  });

  it('returns nothing when the series starts after the range', () => {
    expect(expandOccurrences(series(OCTOBER_FIRST, recurrence('daily')), SEPTEMBER, NOTHING_SKIPPED)).toEqual([]);
  });

  it('repeats daily by the interval', () => {
    const everyOtherDay = series(SEPTEMBER_FIRST, recurrence('daily', TWO_STEPS));

    expect(expandOccurrences(everyOtherDay, FIRST_WEEK, NOTHING_SKIPPED)).toEqual([
      SEPTEMBER_FIRST,
      SEPTEMBER_THIRD,
      SEPTEMBER_FIFTH,
      SEPTEMBER_SEVENTH
    ]);
  });

  it('repeats weekly', () => {
    const weekly = series(SEPTEMBER_FIRST, recurrence('weekly'));

    expect(expandOccurrences(weekly, SEPTEMBER, NOTHING_SKIPPED)).toEqual([
      SEPTEMBER_FIRST,
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29'
    ]);
  });

  it('repeats weekly by the interval', () => {
    const everyOtherWeek = series(SEPTEMBER_FIRST, recurrence('weekly', TWO_STEPS));

    expect(expandOccurrences(everyOtherWeek, SEPTEMBER, NOTHING_SKIPPED)).toEqual([SEPTEMBER_FIRST, '2026-09-15', '2026-09-29']);
  });

  it('repeats monthly and clamps the day to shorter months', () => {
    const monthly = series('2026-01-31', recurrence('monthly'));
    const firstFourMonths = { from: '2026-01-01', to: '2026-04-30' };

    expect(expandOccurrences(monthly, firstFourMonths, NOTHING_SKIPPED)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('repeats monthly by the interval', () => {
    const quarterly = series('2026-01-15', recurrence('monthly', THREE_STEPS));
    const year = { from: '2026-01-01', to: '2026-12-31' };

    expect(expandOccurrences(quarterly, year, NOTHING_SKIPPED)).toEqual(['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15']);
  });

  it('repeats yearly and keeps the leap day in leap years', () => {
    const yearly = series('2024-02-29', recurrence('yearly'));
    const fourYears = { from: '2025-01-01', to: '2028-12-31' };

    expect(expandOccurrences(yearly, fourYears, NOTHING_SKIPPED)).toEqual(['2025-02-28', '2026-02-28', '2027-02-28', '2028-02-29']);
  });

  it('repeats yearly by the interval', () => {
    const everyOtherYear = series('2026-05-01', recurrence('yearly', TWO_STEPS));
    const fiveYears = { from: '2026-01-01', to: '2030-12-31' };

    expect(expandOccurrences(everyOtherYear, fiveYears, NOTHING_SKIPPED)).toEqual(['2026-05-01', '2028-05-01', '2030-05-01']);
  });

  it('stops at the until date when it lies before the range end', () => {
    const daily = series(SEPTEMBER_FIRST, recurrence('daily', SINGLE_STEP, SEPTEMBER_THIRD));

    expect(expandOccurrences(daily, SEPTEMBER, NOTHING_SKIPPED)).toEqual([SEPTEMBER_FIRST, SEPTEMBER_SECOND, SEPTEMBER_THIRD]);
  });

  it('stops at the range end when the until date lies after it', () => {
    const daily = series(SEPTEMBER_FIRST, recurrence('daily', SINGLE_STEP, OCTOBER_TENTH));
    const firstThreeDays = { from: SEPTEMBER_FIRST, to: SEPTEMBER_THIRD };

    expect(expandOccurrences(daily, firstThreeDays, NOTHING_SKIPPED)).toEqual([SEPTEMBER_FIRST, SEPTEMBER_SECOND, SEPTEMBER_THIRD]);
  });

  it('skips excluded occurrence dates', () => {
    const everyOtherDay = series(SEPTEMBER_FIRST, recurrence('daily', TWO_STEPS));
    const skipped = new Set([SEPTEMBER_THIRD, SEPTEMBER_SEVENTH]);

    expect(expandOccurrences(everyOtherDay, FIRST_WEEK, skipped)).toEqual([SEPTEMBER_FIRST, SEPTEMBER_FIFTH]);
  });

  it('includes a recurring multi-day occurrence that overlaps the range start', () => {
    const weekly = series(AUGUST_THIRTIETH, recurrence('weekly'), SEPTEMBER_FIRST);

    expect(expandOccurrences(weekly, FIRST_WEEK, NOTHING_SKIPPED)).toEqual([AUGUST_THIRTIETH, SEPTEMBER_SIXTH]);
  });
});
