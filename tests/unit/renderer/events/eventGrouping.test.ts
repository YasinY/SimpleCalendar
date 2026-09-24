import { describe, expect, it } from 'vitest';
import { groupByDate } from '../../../../src/renderer/events/eventGrouping';
import { createCalendarEvent } from '../../../support/calendarEventFactory';

const FIRST_DATE = '2026-09-16';
const SECOND_DATE = '2026-09-17';

describe('groupByDate', () => {
  it('groups events by date while keeping their order', () => {
    const morning = createCalendarEvent({ id: 'morning', date: FIRST_DATE });
    const other = createCalendarEvent({ id: 'other', date: SECOND_DATE });
    const evening = createCalendarEvent({ id: 'evening', date: FIRST_DATE });

    const grouped = groupByDate([morning, other, evening]);

    expect([...grouped.keys()]).toEqual([FIRST_DATE, SECOND_DATE]);
    expect(grouped.get(FIRST_DATE)).toEqual([morning, evening]);
    expect(grouped.get(SECOND_DATE)).toEqual([other]);
  });

  it('returns an empty map for no events', () => {
    expect(groupByDate([]).size).toBe(0);
  });
});
