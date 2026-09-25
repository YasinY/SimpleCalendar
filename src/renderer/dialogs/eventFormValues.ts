import { DEFAULT_RECURRENCE_INTERVAL, NO_DATE, NO_END_TIME, RECURRENCE_NONE_VALUE, REMINDER_NONE_VALUE } from '@renderer/constants';
import type { Recurrence } from '@shared/recurrence';
import type { RecurrenceFrequency } from '@shared/recurrenceFrequency';

const DECIMAL_RADIX = 10;

export function toReminderValue(reminderMinutes: number | null): string {
  return reminderMinutes === null ? REMINDER_NONE_VALUE : String(reminderMinutes);
}

export function toReminderMinutes(value: string): number | null {
  return value === REMINDER_NONE_VALUE ? null : Number(value);
}

export function toEndTime(value: string): string | null {
  return value === NO_END_TIME ? null : value;
}

export function toOptionalDate(value: string): string | null {
  return value === NO_DATE ? null : value;
}

export function toRecurrenceValue(recurrence: Recurrence | null): string {
  return recurrence === null ? RECURRENCE_NONE_VALUE : recurrence.frequency;
}

export function toIntervalValue(recurrence: Recurrence | null): string {
  return String(recurrence === null ? DEFAULT_RECURRENCE_INTERVAL : recurrence.interval);
}

export function toUntilValue(recurrence: Recurrence | null): string {
  return recurrence === null || recurrence.until === null ? NO_DATE : recurrence.until;
}

export function toInterval(value: string): number {
  const parsed = Number.parseInt(value, DECIMAL_RADIX);
  return Number.isInteger(parsed) && parsed >= DEFAULT_RECURRENCE_INTERVAL ? parsed : DEFAULT_RECURRENCE_INTERVAL;
}

export function toRecurrence(frequency: string, interval: string, until: string): Recurrence | null {
  if (frequency === RECURRENCE_NONE_VALUE) return null;
  return { frequency: frequency as RecurrenceFrequency, interval: toInterval(interval), until: toOptionalDate(until) };
}
