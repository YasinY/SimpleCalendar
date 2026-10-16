import { AT_STATE_CODES } from './holidayRegions';
import { HOLIDAY_RULE } from './holidayRule';
import type { Holiday } from './holiday';

const BURGENLAND = 'AT-1';
const CARINTHIA = 'AT-2';
const LOWER_AUSTRIA = 'AT-3';
const UPPER_AUSTRIA = 'AT-4';
const SALZBURG = 'AT-5';
const STYRIA = 'AT-6';
const TYROL = 'AT-7';
const VORARLBERG = 'AT-8';
const VIENNA = 'AT-9';

export const AUSTRIAN_HOLIDAYS: Holiday[] = [
  { name: 'Neujahr', rule: HOLIDAY_RULE.FIXED, month: 1, day: 1, regions: AT_STATE_CODES },
  { name: 'Heilige Drei Könige', rule: HOLIDAY_RULE.FIXED, month: 1, day: 6, regions: AT_STATE_CODES },
  { name: 'Josef', rule: HOLIDAY_RULE.FIXED, month: 3, day: 19, regions: [CARINTHIA, STYRIA, TYROL, VORARLBERG] },
  { name: 'Ostermontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 1, regions: AT_STATE_CODES },
  { name: 'Staatsfeiertag', rule: HOLIDAY_RULE.FIXED, month: 5, day: 1, regions: AT_STATE_CODES },
  { name: 'Florian', rule: HOLIDAY_RULE.FIXED, month: 5, day: 4, regions: [UPPER_AUSTRIA] },
  { name: 'Christi Himmelfahrt', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 39, regions: AT_STATE_CODES },
  { name: 'Pfingstmontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 50, regions: AT_STATE_CODES },
  { name: 'Fronleichnam', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 60, regions: AT_STATE_CODES },
  { name: 'Mariä Himmelfahrt', rule: HOLIDAY_RULE.FIXED, month: 8, day: 15, regions: AT_STATE_CODES },
  { name: 'Rupert', rule: HOLIDAY_RULE.FIXED, month: 9, day: 24, regions: [SALZBURG] },
  { name: 'Tag der Volksabstimmung', rule: HOLIDAY_RULE.FIXED, month: 10, day: 10, regions: [CARINTHIA] },
  { name: 'Nationalfeiertag', rule: HOLIDAY_RULE.FIXED, month: 10, day: 26, regions: AT_STATE_CODES },
  { name: 'Allerheiligen', rule: HOLIDAY_RULE.FIXED, month: 11, day: 1, regions: AT_STATE_CODES },
  { name: 'Martin', rule: HOLIDAY_RULE.FIXED, month: 11, day: 11, regions: [BURGENLAND] },
  { name: 'Leopold', rule: HOLIDAY_RULE.FIXED, month: 11, day: 15, regions: [LOWER_AUSTRIA, VIENNA] },
  { name: 'Mariä Empfängnis', rule: HOLIDAY_RULE.FIXED, month: 12, day: 8, regions: AT_STATE_CODES },
  { name: 'Christtag', rule: HOLIDAY_RULE.FIXED, month: 12, day: 25, regions: AT_STATE_CODES },
  { name: 'Stefanitag', rule: HOLIDAY_RULE.FIXED, month: 12, day: 26, regions: AT_STATE_CODES }
];
