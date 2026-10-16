import type { EasterRelativeHoliday } from './easterRelativeHoliday';
import type { FixedHoliday } from './fixedHoliday';
import type { RepentanceDayHoliday } from './repentanceDayHoliday';
import type { SundayRelativeHoliday } from './sundayRelativeHoliday';

export type Holiday = FixedHoliday | EasterRelativeHoliday | RepentanceDayHoliday | SundayRelativeHoliday;
