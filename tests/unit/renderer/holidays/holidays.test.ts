import { describe, expect, it } from 'vitest';
import { toIsoDate } from '../../../../src/renderer/date/dateUtils';
import { buildHolidayMap, getEasterSunday, getRepentanceDay } from '../../../../src/renderer/holidays/holidayDates';

function findDate(map: Map<string, string[]>, name: string): string | undefined {
  for (const [iso, names] of map) {
    if (names.includes(name)) return iso;
  }
  return undefined;
}

describe('holidays', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28']
  ])('computes easter sunday for %i', (year, expected) => {
    expect(toIsoDate(getEasterSunday(year))).toBe(expected);
  });

  it.each([
    [2024, '2024-11-20'],
    [2025, '2025-11-19'],
    [2026, '2026-11-18'],
    [2027, '2027-11-17']
  ])('computes repentance day for %i', (year, expected) => {
    expect(toIsoDate(getRepentanceDay(year))).toBe(expected);
  });

  it('returns only nationwide holidays without a state', () => {
    const map = buildHolidayMap([2026], '');
    expect(map.size).toBe(9);
    expect(map.get('2026-10-03')).toEqual(['Tag der Deutschen Einheit']);
    expect(findDate(map, 'Fronleichnam')).toBeUndefined();
  });

  it('adds regional holidays for a state', () => {
    const bavaria = buildHolidayMap([2026], 'BY');
    expect(bavaria.size).toBe(13);
    expect(findDate(bavaria, 'Fronleichnam')).toBe('2026-06-04');
    expect(findDate(bavaria, 'Allerheiligen')).toBe('2026-11-01');
    expect(findDate(buildHolidayMap([2026], 'SN'), 'Buß- und Bettag')).toBe('2026-11-18');
  });

  it('collects both names when two holidays fall on the same day', () => {
    expect(buildHolidayMap([2008], '').get('2008-05-01')).toEqual(['Tag der Arbeit', 'Christi Himmelfahrt']);
  });

  it('covers every requested year', () => {
    const map = buildHolidayMap([2026, 2027], '');
    expect(map.get('2026-01-01')).toEqual(['Neujahr']);
    expect(map.get('2027-01-01')).toEqual(['Neujahr']);
  });
});
