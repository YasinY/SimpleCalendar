import { MINUTES_PER_DAY } from '../constants';
import { formatMinutesOfDay, getDurationMinutes } from '../date/dateUtils';
import type { MoveTarget } from '../views/moveTarget';
import type { CalendarEvent } from '../../shared/calendarEvent';
import type { EventInput } from '../../shared/eventInput';

export function moveEventTo(event: CalendarEvent, { date, startMinutes }: MoveTarget): EventInput {
  if (startMinutes === undefined || event.allDay) return { ...event, date };
  const duration = getDurationMinutes(event);
  const start = Math.min(startMinutes, MINUTES_PER_DAY - duration);
  const endTime = event.endTime ? formatMinutesOfDay(start + duration) : null;
  return { ...event, date, time: formatMinutesOfDay(start), endTime };
}
