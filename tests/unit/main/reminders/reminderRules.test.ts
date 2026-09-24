import { describe, expect, it } from 'vitest';
import { isDue, toEventDate } from '../../../../src/main/reminders/reminderRules';
import { createCalendarEvent } from '../../../support/calendarEventFactory';

const EVENT_DATE = '2026-09-16';
const EVENT_TIME = '09:30';
const REMINDER_MINUTES = 15;
const EVENT_START = new Date(2026, 8, 16, 9, 30, 0, 0);
const TRIGGER_TIME = new Date(2026, 8, 16, 9, 15, 0, 0);
const BEFORE_TRIGGER_TIME = new Date(2026, 8, 16, 9, 14, 59, 999);

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
