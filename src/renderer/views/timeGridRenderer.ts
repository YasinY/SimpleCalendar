import type { DayColumnLayout } from '@renderer/date/dayColumnLayout';
import type { HolidayMap } from '@renderer/holidays/holidayDates';
import type { SegmentsByDate } from './segmentsByDate';

export interface TimeGridRenderer {
  readonly element: HTMLElement;
  start(): void;
  render(layout: DayColumnLayout, segmentsByDate: SegmentsByDate, holidaysByDate: HolidayMap): void;
}
