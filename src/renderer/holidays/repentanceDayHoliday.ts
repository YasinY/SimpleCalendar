import type { HOLIDAY_RULE } from './holidayConstants';

export interface RepentanceDayHoliday {
  name: string;
  rule: typeof HOLIDAY_RULE.REPENTANCE_DAY;
  regions: string[];
}
