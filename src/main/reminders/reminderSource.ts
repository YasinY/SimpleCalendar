import type { CalendarEvent } from '../../shared/calendarEvent';

export interface ReminderSource {
  getPendingReminders(): CalendarEvent[];
  markNotified(id: string): void;
}
