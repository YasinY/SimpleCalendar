import { describe, expect, it } from 'vitest';
import { groupSegmentsByDate } from '@renderer/events/eventGrouping';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';

const FIRST_DATE = '2026-09-16';
const SECOND_DATE = '2026-09-17';
const THIRD_DATE = '2026-09-18';

function segmentIds(segments: { event: { id: string } }[] | undefined): string[] {
  return (segments ?? []).map((segment) => segment.event.id);
}

describe('groupSegmentsByDate', () => {
  it('groups segments by date while keeping their order', () => {
    const morning = createCalendarEvent({ id: 'morning', date: FIRST_DATE });
    const other = createCalendarEvent({ id: 'other', date: SECOND_DATE });
    const evening = createCalendarEvent({ id: 'evening', date: FIRST_DATE });

    const grouped = groupSegmentsByDate([morning, other, evening]);

    expect([...grouped.keys()]).toEqual([FIRST_DATE, SECOND_DATE]);
    expect(segmentIds(grouped.get(FIRST_DATE))).toEqual(['morning', 'evening']);
    expect(segmentIds(grouped.get(SECOND_DATE))).toEqual(['other']);
  });

  it('adds a segment of multi day events to every covered date', () => {
    const trip = createCalendarEvent({ id: 'trip', date: FIRST_DATE, endDate: THIRD_DATE });

    const grouped = groupSegmentsByDate([trip]);

    expect([...grouped.keys()]).toEqual([FIRST_DATE, SECOND_DATE, THIRD_DATE]);
    expect(grouped.get(SECOND_DATE)?.[0].dayOffset).toBe(1);
  });

  it('returns an empty map for no events', () => {
    expect(groupSegmentsByDate([]).size).toBe(0);
  });
});
