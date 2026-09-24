import { NO_END_TIME, REMINDER_NONE_VALUE } from '../constants';

export function toReminderValue(reminderMinutes: number | null): string {
  return reminderMinutes === null ? REMINDER_NONE_VALUE : String(reminderMinutes);
}

export function toReminderMinutes(value: string): number | null {
  return value === REMINDER_NONE_VALUE ? null : Number(value);
}

export function toEndTime(value: string): string | null {
  return value === NO_END_TIME ? null : value;
}
