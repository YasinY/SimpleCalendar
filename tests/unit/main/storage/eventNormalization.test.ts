import { describe, expect, it } from 'vitest';
import {
  NO_RECURRENCE,
  normalizeStoredEvent,
  toStoredColor,
  toStoredEndDate,
  toStoredEndTime,
  toStoredEvent,
  toStoredRecurrence,
  toStoredReminder,
  toStoredText
} from '@main/storage/eventNormalization';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import type { StoredRecurrence } from '@main/storage/storedEvent';
import type { EventInput } from '@shared/eventInput';
import type { Recurrence } from '@shared/recurrence';

const START_DATE = '2026-09-16';
const END_DATE = '2026-09-18';
const EARLIER_DATE = '2026-09-15';
const TARGET_DATE = '2026-09-20';
const SHIFTED_END_DATE = '2026-09-22';
const START_TIME = '09:00';
const LATER_TIME = '10:00';
const EARLIER_TIME = '08:00';
const EMPTY_TEXT = '';
const PADDED_TEXT = '  Text  ';
const TRIMMED_TEXT = 'Text';
const COLOR = '#ff0000';
const REMINDER_MINUTES = 15;
const NUMBER_VALUE = 42;
const EVENT_ID = 'event-7';
const WEEKLY = 'weekly';
const UNKNOWN_FREQUENCY = 'hourly';
const VALID_INTERVAL = 3;
const FRACTIONAL_INTERVAL = 1.5;
const ZERO_INTERVAL = 0;
const DEFAULT_INTERVAL = 1;
const UNTIL = '2026-12-31';
const WEEKLY_RECURRENCE: Recurrence = { frequency: WEEKLY, interval: VALID_INTERVAL, until: UNTIL };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function storedWeekly(interval: number, until: string | null): StoredRecurrence {
  return { recurrenceFrequency: WEEKLY, recurrenceInterval: interval, recurrenceUntil: until };
}

describe('toStoredEndDate', () => {
  it('drops missing, empty or non-string end dates', () => {
    expect(toStoredEndDate(START_DATE, undefined)).toBeNull();
    expect(toStoredEndDate(START_DATE, EMPTY_TEXT)).toBeNull();
    expect(toStoredEndDate(START_DATE, NUMBER_VALUE)).toBeNull();
  });

  it('keeps only end dates after the start date', () => {
    expect(toStoredEndDate(START_DATE, END_DATE)).toBe(END_DATE);
    expect(toStoredEndDate(START_DATE, START_DATE)).toBeNull();
    expect(toStoredEndDate(START_DATE, EARLIER_DATE)).toBeNull();
  });
});

describe('toStoredEndTime', () => {
  it('drops missing or empty end times', () => {
    expect(toStoredEndTime(START_TIME, undefined, false)).toBeNull();
    expect(toStoredEndTime(START_TIME, null, false)).toBeNull();
    expect(toStoredEndTime(START_TIME, EMPTY_TEXT, true)).toBeNull();
  });

  it('keeps only end times after the start time on a single day', () => {
    expect(toStoredEndTime(START_TIME, LATER_TIME, false)).toBe(LATER_TIME);
    expect(toStoredEndTime(START_TIME, START_TIME, false)).toBeNull();
    expect(toStoredEndTime(START_TIME, EARLIER_TIME, false)).toBeNull();
  });

  it('keeps earlier end times when the event spans multiple days', () => {
    expect(toStoredEndTime(START_TIME, EARLIER_TIME, true)).toBe(EARLIER_TIME);
  });
});

describe('toStoredText', () => {
  it('trims strings and replaces other values with an empty text', () => {
    expect(toStoredText(PADDED_TEXT)).toBe(TRIMMED_TEXT);
    expect(toStoredText(NUMBER_VALUE)).toBe(EMPTY_TEXT);
    expect(toStoredText(undefined)).toBe(EMPTY_TEXT);
  });
});

describe('toStoredColor', () => {
  it('keeps non-empty strings', () => {
    expect(toStoredColor(COLOR)).toBe(COLOR);
  });

  it('drops empty strings and non-string values', () => {
    expect(toStoredColor(EMPTY_TEXT)).toBeNull();
    expect(toStoredColor(NUMBER_VALUE)).toBeNull();
    expect(toStoredColor(null)).toBeNull();
  });
});

describe('toStoredReminder', () => {
  it('keeps finite numbers', () => {
    expect(toStoredReminder(REMINDER_MINUTES)).toBe(REMINDER_MINUTES);
  });

  it('drops non-finite numbers and non-number values', () => {
    expect(toStoredReminder(Number.NaN)).toBeNull();
    expect(toStoredReminder(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toStoredReminder(String(REMINDER_MINUTES))).toBeNull();
    expect(toStoredReminder(null)).toBeNull();
  });
});

describe('toStoredRecurrence', () => {
  it('maps a valid recurrence onto the stored columns', () => {
    expect(toStoredRecurrence(WEEKLY_RECURRENCE)).toEqual(storedWeekly(VALID_INTERVAL, UNTIL));
  });

  it('treats values that are not plain objects as no recurrence', () => {
    expect(toStoredRecurrence(null)).toBe(NO_RECURRENCE);
    expect(toStoredRecurrence([WEEKLY_RECURRENCE])).toBe(NO_RECURRENCE);
    expect(toStoredRecurrence(WEEKLY)).toBe(NO_RECURRENCE);
  });

  it('treats unknown or non-string frequencies as no recurrence', () => {
    expect(toStoredRecurrence({ ...WEEKLY_RECURRENCE, frequency: UNKNOWN_FREQUENCY })).toBe(NO_RECURRENCE);
    expect(toStoredRecurrence({ ...WEEKLY_RECURRENCE, frequency: NUMBER_VALUE })).toBe(NO_RECURRENCE);
  });

  it('falls back to the default interval for non-integer, too small or non-number intervals', () => {
    for (const interval of [FRACTIONAL_INTERVAL, ZERO_INTERVAL, String(VALID_INTERVAL)]) {
      expect(toStoredRecurrence({ ...WEEKLY_RECURRENCE, interval })).toEqual(storedWeekly(DEFAULT_INTERVAL, UNTIL));
    }
  });

  it('drops empty or non-string until dates', () => {
    expect(toStoredRecurrence({ ...WEEKLY_RECURRENCE, until: EMPTY_TEXT })).toEqual(storedWeekly(VALID_INTERVAL, null));
    expect(toStoredRecurrence({ ...WEEKLY_RECURRENCE, until: NUMBER_VALUE })).toEqual(storedWeekly(VALID_INTERVAL, null));
  });
});

describe('toStoredEvent', () => {
  const input: EventInput = {
    date: START_DATE,
    time: START_TIME,
    endTime: LATER_TIME,
    allDay: true,
    title: PADDED_TEXT,
    notes: PADDED_TEXT,
    color: COLOR,
    reminderMinutes: REMINDER_MINUTES,
    recurrence: WEEKLY_RECURRENCE
  };

  it('normalizes all fields of an input and resets the notified occurrence', () => {
    expect(toStoredEvent(EVENT_ID, START_DATE, input)).toEqual({
      id: EVENT_ID,
      date: START_DATE,
      endDate: null,
      time: START_TIME,
      endTime: LATER_TIME,
      allDay: true,
      title: TRIMMED_TEXT,
      notes: TRIMMED_TEXT,
      color: COLOR,
      reminderMinutes: REMINDER_MINUTES,
      ...storedWeekly(VALID_INTERVAL, UNTIL),
      notifiedOccurrence: null
    });
  });

  it('fills defaults for a minimal input', () => {
    const stored = toStoredEvent(EVENT_ID, START_DATE, { date: START_DATE, time: START_TIME, title: TRIMMED_TEXT });

    expect(stored).toMatchObject({ endDate: null, endTime: null, allDay: false, notes: EMPTY_TEXT, color: null, reminderMinutes: null });
    expect(stored).toMatchObject(NO_RECURRENCE);
  });

  it('keeps the span of a multi-day input relative to the stored date', () => {
    const multiDay = { ...input, endDate: END_DATE, endTime: EARLIER_TIME };
    const stored = toStoredEvent(EVENT_ID, TARGET_DATE, multiDay);

    expect(stored.date).toBe(TARGET_DATE);
    expect(stored.endDate).toBe(SHIFTED_END_DATE);
    expect(stored.endTime).toBe(EARLIER_TIME);
  });

  it('drops an end date that is not after the input date', () => {
    const stored = toStoredEvent(EVENT_ID, START_DATE, { ...input, endDate: EARLIER_DATE, endTime: EARLIER_TIME });

    expect(stored.endDate).toBeNull();
    expect(stored.endTime).toBeNull();
  });
});

describe('normalizeStoredEvent', () => {
  it('keeps all valid fields of a complete event', () => {
    const event = createCalendarEvent({
      endDate: END_DATE,
      endTime: LATER_TIME,
      allDay: true,
      color: COLOR,
      reminderMinutes: REMINDER_MINUTES,
      recurrence: WEEKLY_RECURRENCE,
      notified: true
    });

    expect(normalizeStoredEvent(event)).toEqual({
      id: event.id,
      date: event.date,
      endDate: END_DATE,
      time: event.time,
      endTime: LATER_TIME,
      allDay: true,
      title: event.title,
      notes: event.notes,
      color: COLOR,
      reminderMinutes: REMINDER_MINUTES,
      ...storedWeekly(VALID_INTERVAL, UNTIL),
      notifiedOccurrence: event.date
    });
  });

  it('fills defaults and generates an id for an empty event', () => {
    const normalized = normalizeStoredEvent({});

    expect(normalized).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      date: EMPTY_TEXT,
      endDate: null,
      time: EMPTY_TEXT,
      endTime: null,
      allDay: false,
      title: EMPTY_TEXT,
      notes: EMPTY_TEXT,
      color: null,
      reminderMinutes: null,
      ...NO_RECURRENCE,
      notifiedOccurrence: null
    });
  });

  it('generates an id when the stored id is empty', () => {
    expect(normalizeStoredEvent({ id: EMPTY_TEXT }).id).toMatch(UUID_PATTERN);
  });

  it('treats non-boolean flags as false', () => {
    const raw = { date: START_DATE, allDay: 'true', notified: 1 } as unknown as Parameters<typeof normalizeStoredEvent>[0];
    const normalized = normalizeStoredEvent(raw);

    expect(normalized.allDay).toBe(false);
    expect(normalized.notifiedOccurrence).toBeNull();
  });
});
