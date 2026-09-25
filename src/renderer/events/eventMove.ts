import { MINUTES_PER_DAY } from '@renderer/constants';
import { formatMinutesOfDay, getDurationMinutes } from '@renderer/date/dateUtils';
import { daysBetween, shiftIsoDate } from '@shared/isoDate';
import type { MoveTarget } from '@renderer/views/moveTarget';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { EventInput } from '@shared/eventInput';

function shiftEndDate(event: CalendarEvent, date: string): string | null {
  return event.endDate === null ? null : shiftIsoDate(event.endDate, daysBetween(event.date, date));
}

export function moveEventTo(event: CalendarEvent, { date, startMinutes }: MoveTarget): EventInput {
  const moved: EventInput = { ...event, occurrenceDate: event.date, date, endDate: shiftEndDate(event, date) };
  if (startMinutes === undefined || event.allDay) return moved;
  if (moved.endDate !== null) return { ...moved, time: formatMinutesOfDay(startMinutes) };
  const duration = getDurationMinutes(event);
  const start = Math.min(startMinutes, MINUTES_PER_DAY - duration);
  const endTime = event.endTime ? formatMinutesOfDay(start + duration) : null;
  return { ...moved, time: formatMinutesOfDay(start), endTime };
}
