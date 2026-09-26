import type { CalendarApi } from './calendarApi';
import type { SplashApi } from './splashApi';

declare global {
  interface Window {
    calendarApi: CalendarApi;
    splashApi: SplashApi;
  }
}

export {};
