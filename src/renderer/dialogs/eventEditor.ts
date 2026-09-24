import type { CalendarEvent } from '../../shared/calendarEvent';

export interface EventEditor {
  openForDate(isoDate: string, time?: string): void;
  openForEvent(event: CalendarEvent): void;
  close(): void;
}
