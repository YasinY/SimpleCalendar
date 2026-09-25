import { describe, expect, it } from 'vitest';
import { findLatestDue, groupBySeries, isDue, toEventDate } from '@main/reminders/reminderRules';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';

const EVENT_DATE = '2026-09-16';
const PREVIOUS_DATE = '2026-09-15';
const NEXT_DATE = '2026-09-17';
const EVENT_TIME = '09:30';
const REMINDER_MINUTES = 15;
const EVENT_START = new Date(2026, 8, 16, 9, 30, 0, 0);
const TRIGGER_TIME = new Date(2026, 8, 16, 9, 15, 0, 0);
const BEFORE_TRIGGER_TIME = new Date(2026, 8, 16, 9, 14, 59, 999);
const SERIES_ID = 'series';
const OTHER_ID = 'other';

describe('toEventDate', () => {
  it('builds a local date from the event date and time', () => {
    expect(toEventDate({ date: EVENT_DATE, time: EVENT_TIME })).toEqual(EVENT_START);
  });
});

describe('isDue', () => {
  const reminderEvent = createCalendarEvent({ date: EVENT_DATE, time: EVENT_TIME, reminderMinutes: REMINDER_MINUTES });

  it('is not due when the event was already notified', () => {
    expect(isDue({ ...reminderEvent, notified: true }, EVENT_START)).toBe(false);
  });

  it('is not due when the event has no reminder', () => {
    expect(isDue({ ...reminderEvent, reminderMinutes: null }, EVENT_START)).toBe(false);
  });

  it('is not due before the reminder trigger time', () => {
    expect(isDue(reminderEvent, BEFORE_TRIGGER_TIME)).toBe(false);
  });

  it('is due at and after the reminder trigger time', () => {
    expect(isDue(reminderEvent, TRIGGER_TIME)).toBe(true);
    expect(isDue(reminderEvent, EVENT_START)).toBe(true);
  });
});

describe('groupBySeries', () => {
  it('groups occurrences by event id and keeps their order', () => {
    const first = createCalendarEvent({ id: SERIES_ID, date: PREVIOUS_DATE });
    const other = createCalendarEvent({ id: OTHER_ID, date: EVENT_DATE });
    const second = createCalendarEvent({ id: SERIES_ID, date: NEXT_DATE });

    const grouped = groupBySeries([first, other, second]);

    expect([...grouped.keys()]).toEqual([SERIES_ID, OTHER_ID]);
    expect(grouped.get(SERIES_ID)).toEqual([first, second]);
    expect(grouped.get(OTHER_ID)).toEqual([other]);
  });

  it('returns an empty map without events', () => {
    expect(groupBySeries([]).size).toBe(0);
  });
});

describe('findLatestDue', () => {
  const previous = createCalendarEvent({ date: PREVIOUS_DATE, time: EVENT_TIME, reminderMinutes: REMINDER_MINUTES });
  const current = createCalendarEvent({ date: EVENT_DATE, time: EVENT_TIME, reminderMinutes: REMINDER_MINUTES });
  const next = createCalendarEvent({ date: NEXT_DATE, time: EVENT_TIME, reminderMinutes: REMINDER_MINUTES });

  it('returns the last occurrence that is due', () => {
    expect(findLatestDue([previous, current, next], TRIGGER_TIME)).toBe(current);
  });

  it('returns undefined when no occurrence is due', () => {
    expect(findLatestDue([current, next], BEFORE_TRIGGER_TIME)).toBeUndefined();
  });
});
