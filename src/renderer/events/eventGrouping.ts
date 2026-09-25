import { splitIntoDaySegments } from './daySegments';
import type { SegmentsByDate } from '@renderer/views/segmentsByDate';
import type { CalendarEvent } from '@shared/calendarEvent';

export function groupSegmentsByDate(events: CalendarEvent[]): SegmentsByDate {
  const grouped: SegmentsByDate = new Map();
  for (const event of events) {
    for (const segment of splitIntoDaySegments(event)) {
      const bucket = grouped.get(segment.date) ?? [];
      bucket.push(segment);
      grouped.set(segment.date, bucket);
    }
  }
  return grouped;
}
