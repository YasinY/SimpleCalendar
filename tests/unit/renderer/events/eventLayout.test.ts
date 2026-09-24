import { describe, expect, it } from 'vitest';
import { layoutDayEvents } from '../../../../src/renderer/events/eventLayout';
import type { CalendarEvent } from '../../../../src/shared/calendarEvent';

function event(id: string, time: string, endTime: string | null): CalendarEvent {
  return {
    id,
    date: '2026-09-16',
    time,
    endTime,
    allDay: false,
    title: id,
    notes: '',
    color: null,
    reminderMinutes: null,
    notified: false
  };
}

describe('layoutDayEvents', () => {
  it('places overlapping events in separate columns of one cluster', () => {
    const placed = layoutDayEvents([
      event('a', '09:00', '11:00'),
      event('b', '10:00', '12:00'),
      event('c', '10:30', '11:00'),
      event('d', '14:00', null)
    ]);
    expect(placed.map((item) => [item.event.id, item.column, item.columnCount, item.start, item.end])).toEqual([
      ['a', 0, 3, 540, 660],
      ['b', 1, 3, 600, 720],
      ['c', 2, 3, 630, 660],
      ['d', 0, 1, 840, 900]
    ]);
  });

  it('reuses a column once the previous event in it has ended', () => {
    const placed = layoutDayEvents([event('a', '09:00', '10:00'), event('b', '09:30', '11:00'), event('c', '10:00', '10:30')]);
    expect(placed.map((item) => [item.event.id, item.column, item.columnCount])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 0, 2]
    ]);
  });

  it('orders events with the same start by the longest first', () => {
    const placed = layoutDayEvents([event('short', '09:00', '09:30'), event('long', '09:00', '11:00')]);
    expect(placed.map((item) => [item.event.id, item.column])).toEqual([
      ['long', 0],
      ['short', 1]
    ]);
  });

  it('clamps events to the end of the day', () => {
    const [placed] = layoutDayEvents([event('late', '23:30', null)]);
    expect(placed.end).toBe(1440);
  });

  it('returns an empty layout for no events', () => {
    expect(layoutDayEvents([])).toEqual([]);
  });
});
