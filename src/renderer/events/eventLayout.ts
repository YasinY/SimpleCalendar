import { DEFAULT_BLOCK_MINUTES, MINUTES_PER_DAY } from '@renderer/constants';
import { getDurationMinutes, toMinutesOfDay } from '@renderer/date/dateUtils';
import { isSingleDay } from './daySegments';
import type { DaySegment } from './daySegment';
import type { EventSpan } from './eventSpan';

const NO_COLUMN = -1;
const FIRST_MINUTE = 0;

export interface EventPlacement extends EventSpan {
  column: number;
  columnCount: number;
}

function singleDaySpan(segment: DaySegment): EventSpan {
  const start = toMinutesOfDay(segment.event.time);
  const duration = getDurationMinutes(segment.event) || DEFAULT_BLOCK_MINUTES;
  return { segment, start, end: Math.min(MINUTES_PER_DAY, start + duration) };
}

function multiDaySpan(segment: DaySegment): EventSpan {
  const { event, isFirst, isLast } = segment;
  const start = isFirst ? toMinutesOfDay(event.time) : FIRST_MINUTE;
  const end = isLast && event.endTime !== null ? toMinutesOfDay(event.endTime) : MINUTES_PER_DAY;
  return { segment, start, end };
}

function toSpan(segment: DaySegment): EventSpan {
  return isSingleDay(segment) ? singleDaySpan(segment) : multiDaySpan(segment);
}

function byStartThenLongest(first: EventSpan, second: EventSpan): number {
  return first.start - second.start || second.end - first.end;
}

function finishCluster(cluster: Omit<EventPlacement, 'columnCount'>[], columnCount: number): EventPlacement[] {
  return cluster.map((item) => ({ ...item, columnCount }));
}

export function layoutDaySegments(segments: DaySegment[]): EventPlacement[] {
  const placed: EventPlacement[] = [];
  let cluster: Omit<EventPlacement, 'columnCount'>[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = 0;

  for (const span of segments.map(toSpan).sort(byStartThenLongest)) {
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
