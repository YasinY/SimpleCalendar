import type { CalendarEvent } from '../../shared/calendarEvent';

export type ReminderNotifier = (event: CalendarEvent, eventDate: Date) => void;
