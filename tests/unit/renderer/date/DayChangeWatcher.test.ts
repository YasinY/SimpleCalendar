import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { CURRENT_TIME_TICK_MS } from '@renderer/constants';
import { DayChangeWatcher } from '@renderer/date/DayChangeWatcher';
import type { DayChangeHandlers } from '@renderer/date/dayChangeHandlers';

const BEFORE_MIDNIGHT = new Date(2026, 8, 28, 23, 59, 30);
const LATER_SAME_DAY = new Date(2026, 8, 28, 23, 59, 50);
const AFTER_MIDNIGHT = new Date(2026, 8, 29, 0, 0, 30);
const MORNING_AFTER = new Date(2026, 8, 29, 11, 53);
const PREVIOUS_DAY = new Date(2026, 8, 28);
const NEXT_DAY = new Date(2026, 8, 29);
const FOCUS_EVENT = 'focus';
const VISIBILITY_EVENT = 'visibilitychange';

let onDayChange: Mock<DayChangeHandlers['onDayChange']>;
let watcher: DayChangeWatcher;

describe('DayChangeWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BEFORE_MIDNIGHT);
    onDayChange = vi.fn();
    watcher = new DayChangeWatcher({ onDayChange });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('stays silent while the day does not change', () => {
    watcher.start();
    vi.setSystemTime(LATER_SAME_DAY);
    window.dispatchEvent(new Event(FOCUS_EVENT));
    expect(onDayChange).not.toHaveBeenCalled();
  });

  it('reports the day change on the next tick after midnight', () => {
    watcher.start();
    vi.advanceTimersByTime(CURRENT_TIME_TICK_MS);
    expect(onDayChange).toHaveBeenCalledExactlyOnceWith(PREVIOUS_DAY, NEXT_DAY);
  });

  it('reports the day change once when the window regains focus', () => {
    watcher.start();
    vi.setSystemTime(MORNING_AFTER);
    window.dispatchEvent(new Event(FOCUS_EVENT));
    window.dispatchEvent(new Event(FOCUS_EVENT));
    expect(onDayChange).toHaveBeenCalledExactlyOnceWith(PREVIOUS_DAY, NEXT_DAY);
  });

  it('reports the day change when the document becomes visible', () => {
    watcher.start();
    vi.setSystemTime(AFTER_MIDNIGHT);
    document.dispatchEvent(new Event(VISIBILITY_EVENT));
    expect(onDayChange).toHaveBeenCalledExactlyOnceWith(PREVIOUS_DAY, NEXT_DAY);
  });

  it('measures from the day it was started on', () => {
    vi.setSystemTime(AFTER_MIDNIGHT);
    watcher.start();
    vi.advanceTimersByTime(CURRENT_TIME_TICK_MS);
    expect(onDayChange).not.toHaveBeenCalled();
  });
});
