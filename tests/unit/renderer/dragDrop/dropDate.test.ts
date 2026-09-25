import { describe, expect, it } from 'vitest';
import { resolveDropDate } from '@renderer/dragDrop/dropDate';

const ZONE_DATE = '2026-09-18';
const SHIFTED_DATE = '2026-09-16';
const DAY_OFFSET = 2;

describe('resolveDropDate', () => {
  it('keeps the zone date without a day offset', () => {
    expect(resolveDropDate(ZONE_DATE, 0)).toBe(ZONE_DATE);
  });

  it('shifts the zone date back by the grabbed day offset', () => {
    expect(resolveDropDate(ZONE_DATE, DAY_OFFSET)).toBe(SHIFTED_DATE);
  });
});
