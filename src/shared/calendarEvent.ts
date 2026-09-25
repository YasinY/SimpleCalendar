import type { Recurrence } from './recurrence';

export interface CalendarEvent {
  id: string;
  date: string;
  endDate: string | null;
  time: string;
  endTime: string | null;
  allDay: boolean;
  title: string;
  notes: string;
  color: string | null;
  reminderMinutes: number | null;
  recurrence: Recurrence | null;
  notified: boolean;
}
