import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  buildDayColumns,
  buildMonthGrid,
  formatLongDate,
  formatMinutesOfDay,
  formatWeekdayDate,
  fromIsoDate,
  getDaysInMonth,
  getDurationMinutes,
  getDurationSteps,
  getMinutesOfDay,
  getMonthGridRange,
  getMonthTitle,
  getWeekDays,
  getWeekdayIndex,
  sortByTime,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateRange,
  toIsoDate,
  toMinutesOfDay
} from '../../../../src/renderer/date/dateUtils';

const WEDNESDAY = new Date(2026, 8, 16);
const WEDNESDAY_AFTERNOON = new Date(2026, 8, 16, 14, 35);
const WEDNESDAY_AFTERNOON_MINUTES = 875;
const JANUARY_END = new Date(2026, 0, 31);
const LEAP_FEBRUARY = new Date(2028, 1, 10);
const LEAP_FEBRUARY_DAYS = 29;
const SEPTEMBER_DAYS = 30;

describe('dateUtils', () => {
  it('formats iso dates with zero padding', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('parses iso dates as local dates', () => {
    expect(fromIsoDate('2026-01-05')).toEqual(new Date(2026, 0, 5));
  });

  it('formats long german dates with weekday and year', () => {
    expect(formatLongDate(WEDNESDAY)).toBe('Mittwoch, 16. September 2026');
  });

  it('uses monday based weekday indexes', () => {
    expect(getWeekdayIndex(new Date(2026, 8, 14))).toBe(0);
    expect(getWeekdayIndex(new Date(2026, 8, 20))).toBe(6);
  });

  it('finds the monday of a week', () => {
    expect(toIsoDate(startOfWeek(WEDNESDAY))).toBe('2026-09-14');
    expect(toIsoDate(startOfWeek(new Date(2026, 8, 20)))).toBe('2026-09-14');
  });

  it('builds seven consecutive week days', () => {
    const days = getWeekDays(startOfWeek(WEDNESDAY)).map(toIsoDate);
    expect(days).toEqual(['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20']);
  });

  it('builds a month grid starting on monday and marks today', () => {
    const grid = buildMonthGrid(WEDNESDAY, WEDNESDAY);
    expect(grid.weekCount).toBe(5);
    expect(grid.cells[0].iso).toBe('2026-08-31');
    expect(grid.cells[0].isCurrentMonth).toBe(false);
    expect(grid.cells.find((cell) => cell.isToday)?.iso).toBe('2026-09-16');
    expect(grid.years).toEqual([2026]);
  });

  it('collects both years when the grid crosses new year', () => {
    expect(buildMonthGrid(new Date(2026, 11, 1), WEDNESDAY).years).toEqual([2026, 2027]);
  });

  it('builds day columns with weekday index and today flag', () => {
    const layout = buildDayColumns([WEDNESDAY, addDays(WEDNESDAY, 1)], WEDNESDAY);
    expect(layout.columns.map((column) => [column.iso, column.weekdayIndex, column.isToday])).toEqual([
      ['2026-09-16', 2, true],
      ['2026-09-17', 3, false]
    ]);
  });

  it('converts between minutes and time strings', () => {
    expect(toMinutesOfDay('10:15')).toBe(615);
    expect(formatMinutesOfDay(615)).toBe('10:15');
    expect(formatMinutesOfDay(0)).toBe('00:00');
  });

  it('computes duration steps capped at four', () => {
    expect(getDurationMinutes({ time: '09:00', endTime: null })).toBe(0);
    expect(getDurationMinutes({ time: '09:00', endTime: '08:00' })).toBe(0);
    expect(getDurationSteps({ time: '09:00', endTime: '10:00' })).toBe(1);
    expect(getDurationSteps({ time: '09:00', endTime: '10:01' })).toBe(2);
    expect(getDurationSteps({ time: '09:00', endTime: '17:00' })).toBe(4);
  });

  it('strips the time of day and jumps to the first of the month', () => {
    expect(startOfDay(WEDNESDAY_AFTERNOON)).toEqual(WEDNESDAY);
    expect(toIsoDate(startOfMonth(WEDNESDAY_AFTERNOON))).toBe('2026-09-01');
  });

  it('adds months without overflowing short months', () => {
    expect(toIsoDate(addMonths(JANUARY_END, 1))).toBe('2026-02-01');
    expect(toIsoDate(addMonths(JANUARY_END, -1))).toBe('2025-12-01');
  });

  it('counts the days of a month including leap years', () => {
    expect(getDaysInMonth(WEDNESDAY)).toBe(SEPTEMBER_DAYS);
    expect(getDaysInMonth(LEAP_FEBRUARY)).toBe(LEAP_FEBRUARY_DAYS);
  });

  it('builds month titles and weekday labels', () => {
    expect(getMonthTitle(WEDNESDAY)).toEqual({ month: 'September', year: '2026' });
    expect(formatWeekdayDate(WEDNESDAY)).toBe('Mittwoch, 16. September');
  });

  it('builds iso date ranges', () => {
    expect(toDateRange(WEDNESDAY, addDays(WEDNESDAY, 1))).toEqual({ from: '2026-09-16', to: '2026-09-17' });
  });

  it('spans the full month grid including leading and trailing days', () => {
    expect(getMonthGridRange(WEDNESDAY)).toEqual({ from: '2026-08-31', to: '2026-10-04' });
  });

  it('sorts events by time without mutating the input', () => {
    const events = [{ time: '10:00' }, { time: '08:30' }, { time: '09:15' }];
    expect(sortByTime(events).map((event) => event.time)).toEqual(['08:30', '09:15', '10:00']);
    expect(events[0].time).toBe('10:00');
  });

  it('computes the minutes of the day of a date', () => {
    expect(getMinutesOfDay(WEDNESDAY_AFTERNOON)).toBe(WEDNESDAY_AFTERNOON_MINUTES);
    expect(getMinutesOfDay(WEDNESDAY)).toBe(0);
  });
});
