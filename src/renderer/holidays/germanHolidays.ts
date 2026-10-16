import { DE_STATE_CODES } from './holidayRegions';
import { HOLIDAY_RULE } from './holidayRule';
import type { Holiday } from './holiday';

export const GERMAN_HOLIDAYS: Holiday[] = [
  { name: 'Neujahr', rule: HOLIDAY_RULE.FIXED, month: 1, day: 1, regions: DE_STATE_CODES },
  { name: 'Heilige Drei Könige', rule: HOLIDAY_RULE.FIXED, month: 1, day: 6, regions: ['BW', 'BY', 'ST'] },
  { name: 'Internationaler Frauentag', rule: HOLIDAY_RULE.FIXED, month: 3, day: 8, regions: ['BE', 'MV'] },
  { name: 'Karfreitag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: -2, regions: DE_STATE_CODES },
  { name: 'Ostersonntag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 0, regions: ['BB'] },
  { name: 'Ostermontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 1, regions: DE_STATE_CODES },
  { name: 'Tag der Arbeit', rule: HOLIDAY_RULE.FIXED, month: 5, day: 1, regions: DE_STATE_CODES },
  { name: 'Christi Himmelfahrt', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 39, regions: DE_STATE_CODES },
  { name: 'Pfingstsonntag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 49, regions: ['BB'] },
  { name: 'Pfingstmontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 50, regions: DE_STATE_CODES },
  { name: 'Fronleichnam', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 60, regions: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'] },
  { name: 'Mariä Himmelfahrt', rule: HOLIDAY_RULE.FIXED, month: 8, day: 15, regions: ['BY', 'SL'] },
  { name: 'Weltkindertag', rule: HOLIDAY_RULE.FIXED, month: 9, day: 20, regions: ['TH'] },
  { name: 'Tag der Deutschen Einheit', rule: HOLIDAY_RULE.FIXED, month: 10, day: 3, regions: DE_STATE_CODES },
  { name: 'Reformationstag', rule: HOLIDAY_RULE.FIXED, month: 10, day: 31, regions: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
  { name: 'Allerheiligen', rule: HOLIDAY_RULE.FIXED, month: 11, day: 1, regions: ['BW', 'BY', 'NW', 'RP', 'SL'] },
  { name: 'Buß- und Bettag', rule: HOLIDAY_RULE.REPENTANCE_DAY, regions: ['SN'] },
  { name: '1. Weihnachtstag', rule: HOLIDAY_RULE.FIXED, month: 12, day: 25, regions: DE_STATE_CODES },
  { name: '2. Weihnachtstag', rule: HOLIDAY_RULE.FIXED, month: 12, day: 26, regions: DE_STATE_CODES }
];
