import type { Holiday } from './holiday';
import type { State } from './state';
import type { SelectOption } from '@renderer/selectOption';

export const STATES: State[] = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bayern' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hessen' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Niedersachsen' },
  { code: 'NW', name: 'Nordrhein-Westfalen' },
  { code: 'RP', name: 'Rheinland-Pfalz' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Sachsen' },
  { code: 'ST', name: 'Sachsen-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thüringen' }
];

export const ALL_STATE_CODES: string[] = STATES.map((state) => state.code);

export const NATIONWIDE_OPTION: State = { code: '', name: 'Bundesweit' };

export const REGION_OPTIONS: SelectOption[] = [NATIONWIDE_OPTION, ...STATES].map(({ code, name }) => ({ value: code, label: name }));

export const HOLIDAY_RULE = {
  FIXED: 'fixed',
  EASTER_RELATIVE: 'easterRelative',
  REPENTANCE_DAY: 'repentanceDay'
} as const;

export type HolidayRule = (typeof HOLIDAY_RULE)[keyof typeof HOLIDAY_RULE];

export const HOLIDAYS: Holiday[] = [
  { name: 'Neujahr', rule: HOLIDAY_RULE.FIXED, month: 1, day: 1, regions: ALL_STATE_CODES },
  { name: 'Heilige Drei Könige', rule: HOLIDAY_RULE.FIXED, month: 1, day: 6, regions: ['BW', 'BY', 'ST'] },
  { name: 'Internationaler Frauentag', rule: HOLIDAY_RULE.FIXED, month: 3, day: 8, regions: ['BE', 'MV'] },
  { name: 'Karfreitag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: -2, regions: ALL_STATE_CODES },
  { name: 'Ostersonntag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 0, regions: ['BB'] },
  { name: 'Ostermontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 1, regions: ALL_STATE_CODES },
  { name: 'Tag der Arbeit', rule: HOLIDAY_RULE.FIXED, month: 5, day: 1, regions: ALL_STATE_CODES },
  { name: 'Christi Himmelfahrt', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 39, regions: ALL_STATE_CODES },
  { name: 'Pfingstsonntag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 49, regions: ['BB'] },
  { name: 'Pfingstmontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 50, regions: ALL_STATE_CODES },
  { name: 'Fronleichnam', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 60, regions: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'] },
  { name: 'Mariä Himmelfahrt', rule: HOLIDAY_RULE.FIXED, month: 8, day: 15, regions: ['BY', 'SL'] },
  { name: 'Weltkindertag', rule: HOLIDAY_RULE.FIXED, month: 9, day: 20, regions: ['TH'] },
  { name: 'Tag der Deutschen Einheit', rule: HOLIDAY_RULE.FIXED, month: 10, day: 3, regions: ALL_STATE_CODES },
  { name: 'Reformationstag', rule: HOLIDAY_RULE.FIXED, month: 10, day: 31, regions: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
  { name: 'Allerheiligen', rule: HOLIDAY_RULE.FIXED, month: 11, day: 1, regions: ['BW', 'BY', 'NW', 'RP', 'SL'] },
  { name: 'Buß- und Bettag', rule: HOLIDAY_RULE.REPENTANCE_DAY, regions: ['SN'] },
  { name: '1. Weihnachtstag', rule: HOLIDAY_RULE.FIXED, month: 12, day: 25, regions: ALL_STATE_CODES },
  { name: '2. Weihnachtstag', rule: HOLIDAY_RULE.FIXED, month: 12, day: 26, regions: ALL_STATE_CODES }
];
