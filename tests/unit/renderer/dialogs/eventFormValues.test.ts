import { describe, expect, it } from 'vitest';
import {
  toEndTime,
  toInterval,
  toIntervalValue,
  toOptionalDate,
  toRecurrence,
  toRecurrenceValue,
  toReminderMinutes,
  toReminderValue,
  toUntilValue
} from '@renderer/dialogs/eventFormValues';
import { DEFAULT_RECURRENCE_INTERVAL, NO_DATE, NO_END_TIME, RECURRENCE_NONE_VALUE, REMINDER_NONE_VALUE } from '@renderer/constants';
import type { Recurrence } from '@shared/recurrence';

const REMINDER_MINUTES = 15;
const END_TIME = '10:30';
const DATE = '2026-09-18';
const UNTIL_DATE = '2026-12-31';
const INTERVAL = 3;
const WEEKLY = 'weekly';
const OPEN_RECURRENCE: Recurrence = { frequency: WEEKLY, interval: INTERVAL, until: null };
const LIMITED_RECURRENCE: Recurrence = { ...OPEN_RECURRENCE, until: UNTIL_DATE };
const INVALID_INTERVALS = ['', 'abc', '0', '-2'];

describe('eventFormValues', () => {
  it('converts reminder minutes to select values', () => {
    expect(toReminderValue(null)).toBe(REMINDER_NONE_VALUE);
    expect(toReminderValue(REMINDER_MINUTES)).toBe(String(REMINDER_MINUTES));
  });

  it('converts select values back to reminder minutes', () => {
    expect(toReminderMinutes(REMINDER_NONE_VALUE)).toBeNull();
    expect(toReminderMinutes(String(REMINDER_MINUTES))).toBe(REMINDER_MINUTES);
  });

  it('treats an empty end time as no end time', () => {
    expect(toEndTime(NO_END_TIME)).toBeNull();
    expect(toEndTime(END_TIME)).toBe(END_TIME);
  });

  it('treats an empty date as no date', () => {
    expect(toOptionalDate(NO_DATE)).toBeNull();
    expect(toOptionalDate(DATE)).toBe(DATE);
  });

  it('converts a recurrence to its form values', () => {
    expect(toRecurrenceValue(null)).toBe(RECURRENCE_NONE_VALUE);
    expect(toRecurrenceValue(OPEN_RECURRENCE)).toBe(WEEKLY);
    expect(toIntervalValue(null)).toBe(String(DEFAULT_RECURRENCE_INTERVAL));
    expect(toIntervalValue(OPEN_RECURRENCE)).toBe(String(INTERVAL));
    expect(toUntilValue(null)).toBe(NO_DATE);
    expect(toUntilValue(OPEN_RECURRENCE)).toBe(NO_DATE);
    expect(toUntilValue(LIMITED_RECURRENCE)).toBe(UNTIL_DATE);
  });

  it('parses positive intervals and falls back to the default otherwise', () => {
    expect(toInterval(String(INTERVAL))).toBe(INTERVAL);
    expect(INVALID_INTERVALS.map(toInterval)).toEqual(INVALID_INTERVALS.map(() => DEFAULT_RECURRENCE_INTERVAL));
  });

  it('builds a recurrence from form values', () => {
    expect(toRecurrence(RECURRENCE_NONE_VALUE, String(INTERVAL), UNTIL_DATE)).toBeNull();
    expect(toRecurrence(WEEKLY, String(INTERVAL), NO_DATE)).toEqual(OPEN_RECURRENCE);
    expect(toRecurrence(WEEKLY, String(INTERVAL), UNTIL_DATE)).toEqual(LIMITED_RECURRENCE);
  });
});
