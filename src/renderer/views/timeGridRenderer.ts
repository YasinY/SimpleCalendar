import type { DayColumnLayout } from '../date/dayColumnLayout';
import type { HolidayMap } from '../holidays/holidayDates';
import type { EventsByDate } from './eventsByDate';

export interface TimeGridRenderer {
  readonly element: HTMLElement;
  start(): void;
  render(layout: DayColumnLayout, eventsByDate: EventsByDate, holidaysByDate: HolidayMap): void;
}
