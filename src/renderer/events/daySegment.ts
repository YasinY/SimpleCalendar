import type { CalendarEvent } from '@shared/calendarEvent';

export interface DaySegment {
  event: CalendarEvent;
  date: string;
  dayOffset: number;
  isFirst: boolean;
  isLast: boolean;
}
