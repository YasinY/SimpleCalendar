import type { CalendarEvent } from '@shared/calendarEvent';

export interface ReminderSource {
  getPendingReminders(referenceDate: string): CalendarEvent[];
  markNotified(id: string, occurrenceDate: string): void;
}
