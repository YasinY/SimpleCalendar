import type { MonthGrid } from '@renderer/date/monthGrid';
import type { HolidayMap } from '@renderer/holidays/holidayDates';
import type { SegmentsByDate } from './segmentsByDate';

export interface MonthRenderer {
  readonly element: HTMLElement;
  render(grid: MonthGrid, segmentsByDate: SegmentsByDate, holidaysByDate: HolidayMap): void;
}
