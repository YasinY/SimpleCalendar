import type { HOLIDAY_RULE } from './holidayRule';

export interface SundayRelativeHoliday {
  name: string;
  rule: typeof HOLIDAY_RULE.SUNDAY_RELATIVE;
  month: number;
  nthSunday: number;
  dayOffset: number;
  regions: string[];
}
