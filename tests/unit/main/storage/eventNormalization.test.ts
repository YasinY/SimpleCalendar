import { describe, expect, it } from 'vitest';
import {
  normalizeStoredEvent,
  toStoredColor,
  toStoredEndTime,
  toStoredReminder,
  toStoredText
} from '../../../../src/main/storage/eventNormalization';
import { createCalendarEvent } from '../../../support/calendarEventFactory';

const START_TIME = '09:00';
const LATER_TIME = '10:00';
const EARLIER_TIME = '08:00';
const EMPTY_TEXT = '';
const PADDED_TEXT = '  Text  ';
const TRIMMED_TEXT = 'Text';
const COLOR = '#ff0000';
const REMINDER_MINUTES = 15;
const NUMBER_VALUE = 42;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('toStoredEndTime', () => {
  it('drops missing or empty end times', () => {
    expect(toStoredEndTime(START_TIME, undefined)).toBeNull();
    expect(toStoredEndTime(START_TIME, null)).toBeNull();
    expect(toStoredEndTime(START_TIME, EMPTY_TEXT)).toBeNull();
  });

  it('keeps only end times after the start time', () => {
    expect(toStoredEndTime(START_TIME, LATER_TIME)).toBe(LATER_TIME);
    expect(toStoredEndTime(START_TIME, START_TIME)).toBeNull();
    expect(toStoredEndTime(START_TIME, EARLIER_TIME)).toBeNull();
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

describe('normalizeStoredEvent', () => {
  it('keeps all valid fields of a complete event', () => {
    const event = createCalendarEvent({
      endTime: LATER_TIME,
      allDay: true,
      color: COLOR,
      reminderMinutes: REMINDER_MINUTES,
      notified: true
    });

    expect(normalizeStoredEvent(event)).toEqual(event);
  });

  it('fills defaults and generates an id for an empty event', () => {
    const normalized = normalizeStoredEvent({});

    expect(normalized).toEqual({
      id: expect.stringMatching(UUID_PATTERN),
      date: EMPTY_TEXT,
      time: EMPTY_TEXT,
      endTime: null,
      allDay: false,
      title: EMPTY_TEXT,
      notes: EMPTY_TEXT,
      color: null,
      reminderMinutes: null,
      notified: false
    });
  });

  it('generates an id when the stored id is empty', () => {
    expect(normalizeStoredEvent({ id: EMPTY_TEXT }).id).toMatch(UUID_PATTERN);
  });

  it('treats non-boolean flags as false', () => {
    const raw = { allDay: 'true', notified: 1 } as unknown as Parameters<typeof normalizeStoredEvent>[0];
    const normalized = normalizeStoredEvent(raw);

    expect(normalized.allDay).toBe(false);
    expect(normalized.notified).toBe(false);
  });
});
