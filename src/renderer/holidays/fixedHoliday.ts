import type { HOLIDAY_RULE } from './holidayRule';

export interface FixedHoliday {
  name: string;
  rule: typeof HOLIDAY_RULE.FIXED;
  month: number;
  day: number;
  regions: string[];
}
