import type { CalendarApi } from './calendarApi';

declare global {
  interface Window {
    calendarApi: CalendarApi;
  }
}

export {};
