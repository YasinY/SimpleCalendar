import { describe, expect, it } from 'vitest';
import { isSingleDay, segmentStartTime, sortSegmentsByStart, splitIntoDaySegments } from '@renderer/events/daySegments';
import { ALL_DAY_TIME } from '@renderer/constants';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import type { DaySegment } from '@renderer/events/daySegment';

const START_DATE = '2026-09-16';
const MIDDLE_DATE = '2026-09-17';
const END_DATE = '2026-09-18';
const EARLY_TIME = '08:00';
const LATE_TIME = '18:00';

function createSegment(overrides: Partial<DaySegment> = {}): DaySegment {
  return { event: createCalendarEvent(), date: START_DATE, dayOffset: 0, isFirst: true, isLast: true, ...overrides };
}

describe('splitIntoDaySegments', () => {
  it('returns one first and last segment for single day events', () => {
    const event = createCalendarEvent({ date: START_DATE });

    expect(splitIntoDaySegments(event)).toEqual([{ event, date: START_DATE, dayOffset: 0, isFirst: true, isLast: true }]);
  });

  it('returns one segment per covered day for multi day events', () => {
    const event = createCalendarEvent({ date: START_DATE, endDate: END_DATE });

    expect(splitIntoDaySegments(event)).toEqual([
      { event, date: START_DATE, dayOffset: 0, isFirst: true, isLast: false },
      { event, date: MIDDLE_DATE, dayOffset: 1, isFirst: false, isLast: false },
      { event, date: END_DATE, dayOffset: 2, isFirst: false, isLast: true }
    ]);
  });
});

describe('isSingleDay', () => {
  it('is only true for segments that are first and last', () => {
    expect(isSingleDay(createSegment())).toBe(true);
    expect(isSingleDay(createSegment({ isLast: false }))).toBe(false);
    expect(isSingleDay(createSegment({ isFirst: false }))).toBe(false);
  });
});

describe('segmentStartTime', () => {
  it('uses the event time for the first segment and midnight otherwise', () => {
    const event = createCalendarEvent({ time: LATE_TIME });

    expect(segmentStartTime(createSegment({ event }))).toBe(LATE_TIME);
    expect(segmentStartTime(createSegment({ event, isFirst: false }))).toBe(ALL_DAY_TIME);
  });
});

describe('sortSegmentsByStart', () => {
  it('sorts by start time without mutating the input', () => {
    const late = createSegment({ event: createCalendarEvent({ time: LATE_TIME }) });
    const early = createSegment({ event: createCalendarEvent({ time: EARLY_TIME }) });
    const continued = createSegment({ event: createCalendarEvent({ time: LATE_TIME }), isFirst: false });
    const segments = [late, early, continued];

    expect(sortSegmentsByStart(segments)).toEqual([continued, early, late]);
    expect(segments).toEqual([late, early, continued]);
  });
});
