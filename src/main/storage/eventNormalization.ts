import { randomUUID } from 'node:crypto';
import { isPlainObject } from './plainObject';
import { daysBetween, shiftIsoDate } from '@shared/isoDate';
import type { StoredEvent, StoredRecurrence } from './storedEvent';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { EventInput } from '@shared/eventInput';
import type { RecurrenceFrequency } from '@shared/recurrenceFrequency';

const EMPTY_TEXT = '';
const DEFAULT_RECURRENCE_INTERVAL = 1;
const RECURRENCE_FREQUENCIES: ReadonlySet<string> = new Set<RecurrenceFrequency>(['daily', 'weekly', 'monthly', 'yearly']);

export const NO_RECURRENCE: StoredRecurrence = {
  recurrenceFrequency: null,
  recurrenceInterval: DEFAULT_RECURRENCE_INTERVAL,
  recurrenceUntil: null
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isRecurrenceFrequency(value: unknown): value is RecurrenceFrequency {
  return typeof value === 'string' && RECURRENCE_FREQUENCIES.has(value);
}

function toStoredInterval(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= DEFAULT_RECURRENCE_INTERVAL ? value : DEFAULT_RECURRENCE_INTERVAL;
}

export function toStoredEndDate(date: string, endDate: unknown): string | null {
  return isNonEmptyString(endDate) && endDate > date ? endDate : null;
}

export function toStoredEndTime(startTime: string, endTime: unknown, spansMultipleDays: boolean): string | null {
  if (!isNonEmptyString(endTime)) return null;
  return spansMultipleDays || endTime > startTime ? endTime : null;
}

export function toStoredText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : EMPTY_TEXT;
}

export function toStoredColor(color: unknown): string | null {
  return isNonEmptyString(color) ? color : null;
}

export function toStoredReminder(reminderMinutes: unknown): number | null {
  return typeof reminderMinutes === 'number' && Number.isFinite(reminderMinutes) ? reminderMinutes : null;
}

export function toStoredRecurrence(recurrence: unknown): StoredRecurrence {
  if (!isPlainObject(recurrence) || !isRecurrenceFrequency(recurrence.frequency)) return NO_RECURRENCE;
  return {
    recurrenceFrequency: recurrence.frequency,
    recurrenceInterval: toStoredInterval(recurrence.interval),
    recurrenceUntil: isNonEmptyString(recurrence.until) ? recurrence.until : null
  };
}

export function toStoredEvent(id: string, date: string, input: EventInput): StoredEvent {
  const inputEndDate = toStoredEndDate(input.date, input.endDate);
  const endDate = inputEndDate === null ? null : shiftIsoDate(date, daysBetween(input.date, inputEndDate));
  return {
    id,
    date,
    endDate,
    time: input.time,
    endTime: toStoredEndTime(input.time, input.endTime, endDate !== null),
    allDay: input.allDay === true,
    title: toStoredText(input.title),
    notes: toStoredText(input.notes),
    color: toStoredColor(input.color),
    reminderMinutes: toStoredReminder(input.reminderMinutes),
    ...toStoredRecurrence(input.recurrence),
    notifiedOccurrence: null
  };
}

export function normalizeStoredEvent(raw: Partial<CalendarEvent>): StoredEvent {
  const date = typeof raw.date === 'string' ? raw.date : EMPTY_TEXT;
  return {
    id: isNonEmptyString(raw.id) ? raw.id : randomUUID(),
    date,
    endDate: toStoredEndDate(date, raw.endDate),
    time: typeof raw.time === 'string' ? raw.time : EMPTY_TEXT,
    endTime: isNonEmptyString(raw.endTime) ? raw.endTime : null,
    allDay: raw.allDay === true,
    title: toStoredText(raw.title),
    notes: toStoredText(raw.notes),
    color: toStoredColor(raw.color),
    reminderMinutes: toStoredReminder(raw.reminderMinutes),
    ...toStoredRecurrence(raw.recurrence),
    notifiedOccurrence: raw.notified === true ? date : null
  };
}
