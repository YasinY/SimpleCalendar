import type { MonthGrid } from '../date/monthGrid';
import type { HolidayMap } from '../holidays/holidayDates';
import type { EventsByDate } from './eventsByDate';

export interface MonthRenderer {
  readonly element: HTMLElement;
  render(grid: MonthGrid, eventsByDate: EventsByDate, holidaysByDate: HolidayMap): void;
}
