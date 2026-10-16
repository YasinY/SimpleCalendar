import type { HOLIDAY_RULE } from './holidayRule';

export interface EasterRelativeHoliday {
  name: string;
  rule: typeof HOLIDAY_RULE.EASTER_RELATIVE;
  easterOffset: number;
  regions: string[];
}
