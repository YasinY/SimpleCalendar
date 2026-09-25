import type { CalendarEvent } from '@shared/calendarEvent';

export type TimedEvent = Pick<CalendarEvent, 'time' | 'endTime'>;
