import type { CalendarEvent } from './calendarEvent';
import type { DateRange } from './dateRange';
import type { EventInput } from './eventInput';
import type { OccurrenceRef } from './occurrenceRef';
import type { Settings } from './settings';

export interface CalendarApi {
  getEvents(range: DateRange): Promise<CalendarEvent[]>;
  saveEvent(input: EventInput): Promise<CalendarEvent>;
  saveOccurrence(input: EventInput): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<boolean>;
  deleteOccurrence(ref: OccurrenceRef): Promise<boolean>;
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  getAppVersion(): Promise<string>;
  minimizeWindow(): void;
  toggleMaximizeWindow(): void;
  hideWindow(): void;
}
