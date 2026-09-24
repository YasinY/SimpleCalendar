export interface EventInput {
  id?: string | null;
  date: string;
  time: string;
  endTime?: string | null;
  allDay?: boolean;
  title: string;
  notes?: string;
  color?: string | null;
  reminderMinutes?: number | null;
}
