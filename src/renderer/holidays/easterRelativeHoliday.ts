import type { HOLIDAY_RULE } from './holidayConstants';

export interface EasterRelativeHoliday {
  name: string;
  rule: typeof HOLIDAY_RULE.EASTER_RELATIVE;
  easterOffset: number;
  regions: string[];
}
