import { MILLISECONDS_PER_MINUTE } from '../constants';
import type { CalendarEvent } from '../../shared/calendarEvent';

const DATE_PART_SEPARATOR = '-';
const TIME_PART_SEPARATOR = ':';
const MONTH_OFFSET = 1;
const DECIMAL_RADIX = 10;

function toNumbers(value: string, separator: string): number[] {
  return value.split(separator).map((part) => parseInt(part, DECIMAL_RADIX));
}

export function toEventDate(event: Pick<CalendarEvent, 'date' | 'time'>): Date {
  const [year, month, day] = toNumbers(event.date, DATE_PART_SEPARATOR);
  const [hours, minutes] = toNumbers(event.time, TIME_PART_SEPARATOR);
  return new Date(year, month - MONTH_OFFSET, day, hours, minutes, 0, 0);
}

export function isDue(event: CalendarEvent, now: Date): boolean {
  if (event.notified) return false;
  if (event.reminderMinutes === null) return false;
  const triggerTime = toEventDate(event).getTime() - event.reminderMinutes * MILLISECONDS_PER_MINUTE;
  return now.getTime() >= triggerTime;
}
