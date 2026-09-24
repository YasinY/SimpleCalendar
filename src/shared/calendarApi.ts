import type { CalendarEvent } from './calendarEvent';
import type { DateRange } from './dateRange';
import type { EventInput } from './eventInput';
import type { Settings } from './settings';

export interface CalendarApi {
  getEvents(range: DateRange): Promise<CalendarEvent[]>;
  saveEvent(input: EventInput): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<boolean>;
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  minimizeWindow(): void;
  toggleMaximizeWindow(): void;
  hideWindow(): void;
}
