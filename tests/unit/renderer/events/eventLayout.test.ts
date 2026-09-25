import { describe, expect, it } from 'vitest';
import { layoutDaySegments } from '@renderer/events/eventLayout';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import type { DaySegment } from '@renderer/events/daySegment';

const START_DATE = '2026-09-16';
const END_DATE = '2026-09-18';
const MINUTES_PER_DAY = 1440;
const MULTI_DAY_START = '20:00';
const MULTI_DAY_END = '10:00';
const MULTI_DAY_START_MINUTES = 1200;
const MULTI_DAY_END_MINUTES = 600;

function segment(id: string, time: string, endTime: string | null): DaySegment {
  const event = createCalendarEvent({ id, date: START_DATE, time, endTime, title: id });
  return { event, date: START_DATE, dayOffset: 0, isFirst: true, isLast: true };
}

function multiDaySegment(isFirst: boolean, isLast: boolean, endTime: string | null): DaySegment {
  const event = createCalendarEvent({ date: START_DATE, endDate: END_DATE, time: MULTI_DAY_START, endTime });
  return { event, date: START_DATE, dayOffset: 0, isFirst, isLast };
}

function spanOf(placed: DaySegment): [number, number] {
  const [placement] = layoutDaySegments([placed]);
  return [placement.start, placement.end];
}

describe('layoutDaySegments', () => {
  it('places overlapping events in separate columns of one cluster', () => {
    const placed = layoutDaySegments([
      segment('a', '09:00', '11:00'),
      segment('b', '10:00', '12:00'),
      segment('c', '10:30', '11:00'),
      segment('d', '14:00', null)
    ]);
    expect(placed.map((item) => [item.segment.event.id, item.column, item.columnCount, item.start, item.end])).toEqual([
      ['a', 0, 3, 540, 660],
      ['b', 1, 3, 600, 720],
      ['c', 2, 3, 630, 660],
      ['d', 0, 1, 840, 900]
    ]);
  });

  it('reuses a column once the previous event in it has ended', () => {
    const placed = layoutDaySegments([segment('a', '09:00', '10:00'), segment('b', '09:30', '11:00'), segment('c', '10:00', '10:30')]);
    expect(placed.map((item) => [item.segment.event.id, item.column, item.columnCount])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 0, 2]
    ]);
  });

  it('orders events with the same start by the longest first', () => {
    const placed = layoutDaySegments([segment('short', '09:00', '09:30'), segment('long', '09:00', '11:00')]);
    expect(placed.map((item) => [item.segment.event.id, item.column])).toEqual([
      ['long', 0],
      ['short', 1]
    ]);
  });

  it('clamps events to the end of the day', () => {
    const [placed] = layoutDaySegments([segment('late', '23:30', null)]);
    expect(placed.end).toBe(MINUTES_PER_DAY);
  });

  it('spans the first day of a multi day event from its start to the end of the day', () => {
    expect(spanOf(multiDaySegment(true, false, MULTI_DAY_END))).toEqual([MULTI_DAY_START_MINUTES, MINUTES_PER_DAY]);
  });

  it('spans middle days of a multi day event over the whole day', () => {
    expect(spanOf(multiDaySegment(false, false, MULTI_DAY_END))).toEqual([0, MINUTES_PER_DAY]);
  });

  it('spans the last day of a multi day event until its end time', () => {
    expect(spanOf(multiDaySegment(false, true, MULTI_DAY_END))).toEqual([0, MULTI_DAY_END_MINUTES]);
  });

  it('spans the last day of a multi day event without end time over the whole day', () => {
    expect(spanOf(multiDaySegment(false, true, null))).toEqual([0, MINUTES_PER_DAY]);
  });

  it('returns an empty layout for no events', () => {
    expect(layoutDaySegments([])).toEqual([]);
  });
});
