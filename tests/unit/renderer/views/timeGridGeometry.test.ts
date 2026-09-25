import { afterEach, describe, expect, it, vi } from 'vitest';
import { DRAG_SNAP_MINUTES, MINUTES_PER_DAY } from '@renderer/constants';
import { minutesFromPointer, snapMinutes } from '@renderer/views/timeGridGeometry';

const COLUMN_TOP = 100;
const COLUMN_HEIGHT = 2880;
const HALF = 0.5;
const SLIGHTLY_OFF = 4;
const DAY_START = 0;
const SNAPPED_TARGET = DRAG_SNAP_MINUTES * 2;
const LAST_SNAP_START = MINUTES_PER_DAY - DRAG_SNAP_MINUTES;

describe('timeGridGeometry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts the pointer position into minutes of the day', () => {
    const column = document.createElement('div');
    vi.spyOn(column, 'getBoundingClientRect').mockReturnValue({ top: COLUMN_TOP, height: COLUMN_HEIGHT } as DOMRect);
    expect(minutesFromPointer(column, COLUMN_TOP + COLUMN_HEIGHT * HALF)).toBe(MINUTES_PER_DAY * HALF);
    expect(minutesFromPointer(column, COLUMN_TOP)).toBe(DAY_START);
  });

  it('rounds minutes to the nearest snap step', () => {
    expect(snapMinutes(SNAPPED_TARGET + SLIGHTLY_OFF)).toBe(SNAPPED_TARGET);
    expect(snapMinutes(SNAPPED_TARGET - SLIGHTLY_OFF)).toBe(SNAPPED_TARGET);
  });

  it('clamps to the start of the day', () => {
    expect(snapMinutes(-SNAPPED_TARGET)).toBe(DAY_START);
  });

  it('clamps to the last snap start of the day', () => {
    expect(snapMinutes(MINUTES_PER_DAY)).toBe(LAST_SNAP_START);
  });
});
