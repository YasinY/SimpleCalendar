import type { CalendarEvent } from '../../shared/calendarEvent';

export interface EventSpan {
  event: CalendarEvent;
  start: number;
  end: number;
}
