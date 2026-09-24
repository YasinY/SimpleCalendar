import { DEFAULT_BLOCK_MINUTES, MINUTES_PER_DAY } from '../constants';
import { getDurationMinutes, toMinutesOfDay } from '../date/dateUtils';
import type { EventSpan } from './eventSpan';
import type { CalendarEvent } from '../../shared/calendarEvent';

const NO_COLUMN = -1;

export interface EventPlacement extends EventSpan {
  column: number;
  columnCount: number;
}

function toSpan(event: CalendarEvent): EventSpan {
  const start = toMinutesOfDay(event.time);
  const duration = getDurationMinutes(event) || DEFAULT_BLOCK_MINUTES;
  return { event, start, end: Math.min(MINUTES_PER_DAY, start + duration) };
}

function byStartThenLongest(first: EventSpan, second: EventSpan): number {
  return first.start - second.start || second.end - first.end;
}

function finishCluster(cluster: Omit<EventPlacement, 'columnCount'>[], columnCount: number): EventPlacement[] {
  return cluster.map((item) => ({ ...item, columnCount }));
}

export function layoutDayEvents(events: CalendarEvent[]): EventPlacement[] {
  const placed: EventPlacement[] = [];
  let cluster: Omit<EventPlacement, 'columnCount'>[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = 0;

  for (const span of events.map(toSpan).sort(byStartThenLongest)) {
    if (cluster.length > 0 && span.start >= clusterEnd) {
      placed.push(...finishCluster(cluster, columnEnds.length));
      cluster = [];
      columnEnds = [];
      clusterEnd = 0;
    }

    let column = columnEnds.findIndex((end) => end <= span.start);
    if (column === NO_COLUMN) {
      column = columnEnds.length;
      columnEnds.push(span.end);
    } else {
      columnEnds[column] = span.end;
    }

    cluster.push({ ...span, column });
    clusterEnd = Math.max(clusterEnd, span.end);
  }

  placed.push(...finishCluster(cluster, columnEnds.length));
  return placed;
}
