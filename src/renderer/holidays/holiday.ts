import type { EasterRelativeHoliday } from './easterRelativeHoliday';
import type { FixedHoliday } from './fixedHoliday';
import type { RepentanceDayHoliday } from './repentanceDayHoliday';

export type Holiday = FixedHoliday | EasterRelativeHoliday | RepentanceDayHoliday;
