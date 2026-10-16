import type { HOLIDAY_RULE } from './holidayRule';

export interface RepentanceDayHoliday {
  name: string;
  rule: typeof HOLIDAY_RULE.REPENTANCE_DAY;
  regions: string[];
}
