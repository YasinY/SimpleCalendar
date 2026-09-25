import type { Recurrence } from './recurrence';

export interface EventInput {
  id?: string | null;
  occurrenceDate?: string | null;
  date: string;
  endDate?: string | null;
  time: string;
  endTime?: string | null;
  allDay?: boolean;
  title: string;
  notes?: string;
  color?: string | null;
  reminderMinutes?: number | null;
  recurrence?: Recurrence | null;
}
