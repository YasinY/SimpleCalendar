import { ALL_DAY_TIME, NO_DAY_OFFSET } from '@renderer/constants';
import { daysBetween, shiftIsoDate } from '@shared/isoDate';
import type { DaySegment } from './daySegment';
import type { CalendarEvent } from '@shared/calendarEvent';

export function splitIntoDaySegments(event: CalendarEvent): DaySegment[] {
  const lastOffset = event.endDate === null ? NO_DAY_OFFSET : daysBetween(event.date, event.endDate);
  return Array.from({ length: lastOffset + 1 }, (_unused, dayOffset) => ({
    event,
    date: shiftIsoDate(event.date, dayOffset),
    dayOffset,
    isFirst: dayOffset === NO_DAY_OFFSET,
    isLast: dayOffset === lastOffset
  }));
}

export function isSingleDay({ isFirst, isLast }: DaySegment): boolean {
  return isFirst && isLast;
}

export function segmentStartTime({ event, isFirst }: DaySegment): string {
  return isFirst ? event.time : ALL_DAY_TIME;
}

export function sortSegmentsByStart(segments: DaySegment[]): DaySegment[] {
  return [...segments].sort((first, second) => segmentStartTime(first).localeCompare(segmentStartTime(second)));
}
