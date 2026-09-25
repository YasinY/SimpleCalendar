import { EVENT_KEY_SEPARATOR } from '@renderer/constants';
import type { CalendarEvent } from '@shared/calendarEvent';

export function toEventKey({ id, date }: Pick<CalendarEvent, 'id' | 'date'>): string {
  return id + EVENT_KEY_SEPARATOR + date;
}
