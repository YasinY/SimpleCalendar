import { describe, expect, it } from 'vitest';
import { toIsoDate } from '@renderer/date/dateUtils';
import { VIEW_MODE_CONFIG, resolveViewMode } from '@renderer/date/viewModes';

const WEDNESDAY = new Date(2026, 8, 16);

describe('viewModes', () => {
  it('normalizes and titles the month view', () => {
    const config = VIEW_MODE_CONFIG.month;
    expect(toIsoDate(config.normalize(WEDNESDAY))).toBe('2026-09-01');
    expect(config.buildTitle(config.normalize(WEDNESDAY))).toEqual({ main: 'September', year: '2026' });
    expect(toIsoDate(config.shift(config.normalize(WEDNESDAY), 1))).toBe('2026-10-01');
  });

  it('normalizes and titles the week view', () => {
    const config = VIEW_MODE_CONFIG.week;
    const weekStart = config.normalize(WEDNESDAY);
    expect(toIsoDate(weekStart)).toBe('2026-09-14');
    expect(config.buildTitle(weekStart)).toEqual({ main: '14. – 20. September', year: '2026' });
    expect(config.buildTitle(new Date(2026, 8, 28))).toEqual({ main: '28. September – 4. Oktober', year: '2026' });
    expect(toIsoDate(config.shift(weekStart, -1))).toBe('2026-09-07');
  });

  it('titles the day view with the weekday name', () => {
    const config = VIEW_MODE_CONFIG.day;
    expect(config.buildTitle(WEDNESDAY)).toEqual({ main: 'Mittwoch, 16. September', year: '2026' });
    expect(toIsoDate(config.shift(WEDNESDAY, 1))).toBe('2026-09-17');
  });

  it('shifts the week view by whole weeks and covers seven days', () => {
    const config = VIEW_MODE_CONFIG.week;
    const weekStart = config.normalize(WEDNESDAY);
    expect(toIsoDate(config.shift(weekStart, 2))).toBe('2026-09-28');
    expect(config.range(weekStart)).toEqual({ from: '2026-09-14', to: '2026-09-20' });
  });

  it('shifts the day view by days and covers a single day', () => {
    const config = VIEW_MODE_CONFIG.day;
    expect(toIsoDate(config.shift(WEDNESDAY, -1))).toBe('2026-09-15');
    expect(config.range(WEDNESDAY)).toEqual({ from: '2026-09-16', to: '2026-09-16' });
  });

  it('covers the whole month grid in the month view', () => {
    expect(VIEW_MODE_CONFIG.month.range(WEDNESDAY)).toEqual({ from: '2026-08-31', to: '2026-10-04' });
  });

  it('knows whether a period contains a date', () => {
    expect(VIEW_MODE_CONFIG.month.contains(new Date(2026, 8, 1), WEDNESDAY)).toBe(true);
    expect(VIEW_MODE_CONFIG.month.contains(new Date(2026, 9, 1), WEDNESDAY)).toBe(false);
    expect(VIEW_MODE_CONFIG.week.contains(new Date(2026, 8, 14), new Date(2026, 8, 20, 23, 59))).toBe(true);
    expect(VIEW_MODE_CONFIG.week.contains(new Date(2026, 8, 14), new Date(2026, 8, 21))).toBe(false);
    expect(VIEW_MODE_CONFIG.day.contains(WEDNESDAY, new Date(2026, 8, 16, 15))).toBe(true);
    expect(VIEW_MODE_CONFIG.day.contains(WEDNESDAY, new Date(2026, 8, 17))).toBe(false);
  });

  it('falls back to the month view for unknown modes', () => {
    expect(resolveViewMode('week')).toBe('week');
    expect(resolveViewMode('nope')).toBe('month');
    expect(resolveViewMode(undefined)).toBe('month');
  });
});
