import type { EventsByDate } from '../views/eventsByDate';
import type { CalendarEvent } from '../../shared/calendarEvent';

export function groupByDate(events: CalendarEvent[]): EventsByDate {
  const grouped: EventsByDate = new Map();
  for (const event of events) {
    const bucket = grouped.get(event.date);
    if (bucket) {
      bucket.push(event);
      continue;
    }
    grouped.set(event.date, [event]);
  }
  return grouped;
}
