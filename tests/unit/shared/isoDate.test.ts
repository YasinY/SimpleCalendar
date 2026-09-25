import { describe, expect, it } from 'vitest';
import { addDays, addMonthsKeepingDay, daysBetween, fromIsoDate, shiftIsoDate, toIsoDate } from '@shared/isoDate';

const SEPTEMBER_FIFTH = new Date(2026, 8, 5);
const SEPTEMBER_FIFTH_ISO = '2026-09-05';
const DECEMBER_LAST = new Date(2026, 11, 31);
const JANUARY_FIRST_NEXT_YEAR = new Date(2027, 0, 1);
const JANUARY_LAST = new Date(2026, 0, 31);
const FEBRUARY_LAST = new Date(2026, 1, 28);
const LEAP_JANUARY_LAST = new Date(2028, 0, 31);
const LEAP_FEBRUARY_LAST = new Date(2028, 1, 29);
const MARCH_LAST = new Date(2026, 2, 31);
const NOVEMBER_FIFTH_PREVIOUS_YEAR = new Date(2025, 10, 5);
const ONE_DAY = 1;
const ONE_MONTH = 1;
const TWO_MONTHS = 2;
const MINUS_TEN_MONTHS = -10;
const NO_DAYS = 0;
const DAYS_ACROSS_DST_CHANGE = 7;
const DST_WEEK_START = '2026-10-22';
const DST_WEEK_END = '2026-10-29';
const MONTH_END_ISO = '2026-09-30';
const NEXT_MONTH_START_ISO = '2026-10-01';

describe('toIsoDate', () => {
  it('formats a local date with zero padded month and day', () => {
    expect(toIsoDate(SEPTEMBER_FIFTH)).toBe(SEPTEMBER_FIFTH_ISO);
  });
});

describe('fromIsoDate', () => {
  it('parses an iso date as local midnight', () => {
    expect(fromIsoDate(SEPTEMBER_FIFTH_ISO)).toEqual(SEPTEMBER_FIFTH);
  });
});

describe('addDays', () => {
  it('moves across month and year boundaries', () => {
    expect(addDays(DECEMBER_LAST, ONE_DAY)).toEqual(JANUARY_FIRST_NEXT_YEAR);
    expect(addDays(JANUARY_FIRST_NEXT_YEAR, -ONE_DAY)).toEqual(DECEMBER_LAST);
  });
});

describe('addMonthsKeepingDay', () => {
  it('keeps the day of month when the target month is long enough', () => {
    expect(addMonthsKeepingDay(JANUARY_LAST, TWO_MONTHS)).toEqual(MARCH_LAST);
  });

  it('clamps the day to the length of the target month', () => {
    expect(addMonthsKeepingDay(JANUARY_LAST, ONE_MONTH)).toEqual(FEBRUARY_LAST);
    expect(addMonthsKeepingDay(LEAP_JANUARY_LAST, ONE_MONTH)).toEqual(LEAP_FEBRUARY_LAST);
  });

  it('moves backwards across a year boundary', () => {
    expect(addMonthsKeepingDay(SEPTEMBER_FIFTH, MINUS_TEN_MONTHS)).toEqual(NOVEMBER_FIFTH_PREVIOUS_YEAR);
  });
});

describe('shiftIsoDate', () => {
  it('shifts an iso date by whole days', () => {
    expect(shiftIsoDate(MONTH_END_ISO, ONE_DAY)).toBe(NEXT_MONTH_START_ISO);
    expect(shiftIsoDate(NEXT_MONTH_START_ISO, -ONE_DAY)).toBe(MONTH_END_ISO);
  });
});

describe('daysBetween', () => {
  it('counts calendar days in both directions', () => {
    expect(daysBetween(MONTH_END_ISO, NEXT_MONTH_START_ISO)).toBe(ONE_DAY);
    expect(daysBetween(NEXT_MONTH_START_ISO, MONTH_END_ISO)).toBe(-ONE_DAY);
    expect(daysBetween(MONTH_END_ISO, MONTH_END_ISO)).toBe(NO_DAYS);
  });

  it('ignores daylight saving time changes', () => {
    expect(daysBetween(DST_WEEK_START, DST_WEEK_END)).toBe(DAYS_ACROSS_DST_CHANGE);
  });
});
