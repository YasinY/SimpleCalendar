import { CH_STATE_CODES, swissCantonsExcept } from './holidayRegions';
import { HOLIDAY_RULE } from './holidayRule';
import type { Holiday } from './holiday';

const AARGAU = 'CH-AG';
const APPENZELL_INNERRHODEN = 'CH-AI';
const BASEL_LANDSCHAFT = 'CH-BL';
const BASEL_STADT = 'CH-BS';
const BERN = 'CH-BE';
const FRIBOURG = 'CH-FR';
const GENEVA = 'CH-GE';
const GLARUS = 'CH-GL';
const JURA = 'CH-JU';
const LUCERNE = 'CH-LU';
const NEUCHATEL = 'CH-NE';
const NIDWALDEN = 'CH-NW';
const OBWALDEN = 'CH-OW';
const SCHAFFHAUSEN = 'CH-SH';
const SCHWYZ = 'CH-SZ';
const SOLOTHURN = 'CH-SO';
const ST_GALLEN = 'CH-SG';
const TICINO = 'CH-TI';
const THURGAU = 'CH-TG';
const URI = 'CH-UR';
const VAUD = 'CH-VD';
const VALAIS = 'CH-VS';
const ZUG = 'CH-ZG';
const ZURICH = 'CH-ZH';

const CATHOLIC_CANTONS = [LUCERNE, URI, SCHWYZ, OBWALDEN, NIDWALDEN, ZUG, FRIBOURG, SOLOTHURN, APPENZELL_INNERRHODEN, TICINO, VALAIS, JURA];
const FIRST_SUNDAY = 1;
const THIRD_SUNDAY = 3;
const THURSDAY_AFTER_SUNDAY = 4;
const MONDAY_AFTER_SUNDAY = 1;

export const SWISS_HOLIDAYS: Holiday[] = [
  { name: 'Neujahr', rule: HOLIDAY_RULE.FIXED, month: 1, day: 1, regions: CH_STATE_CODES },
  { name: 'Berchtoldstag', rule: HOLIDAY_RULE.FIXED, month: 1, day: 2, regions: [ZURICH, BERN, LUCERNE, OBWALDEN, GLARUS, ZUG, FRIBOURG, SOLOTHURN, SCHAFFHAUSEN, AARGAU, THURGAU, VAUD, NEUCHATEL, JURA] },
  { name: 'Heilige Drei Könige', rule: HOLIDAY_RULE.FIXED, month: 1, day: 6, regions: [URI, SCHWYZ, TICINO] },
  { name: 'Josefstag', rule: HOLIDAY_RULE.FIXED, month: 3, day: 19, regions: [URI, SCHWYZ, NIDWALDEN, TICINO, VALAIS] },
  { name: 'Karfreitag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: -2, regions: swissCantonsExcept(TICINO, VALAIS) },
  { name: 'Ostermontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 1, regions: swissCantonsExcept(VALAIS) },
  { name: 'Tag der Arbeit', rule: HOLIDAY_RULE.FIXED, month: 5, day: 1, regions: [ZURICH, BASEL_STADT, BASEL_LANDSCHAFT, SCHAFFHAUSEN, TICINO, NEUCHATEL, JURA] },
  { name: 'Auffahrt', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 39, regions: CH_STATE_CODES },
  { name: 'Pfingstmontag', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 50, regions: swissCantonsExcept(VALAIS) },
  { name: 'Fronleichnam', rule: HOLIDAY_RULE.EASTER_RELATIVE, easterOffset: 60, regions: CATHOLIC_CANTONS },
  { name: 'Fest der Unabhängigkeit', rule: HOLIDAY_RULE.FIXED, month: 6, day: 23, regions: [JURA] },
  { name: 'Peter und Paul', rule: HOLIDAY_RULE.FIXED, month: 6, day: 29, regions: [TICINO] },
  { name: 'Bundesfeiertag', rule: HOLIDAY_RULE.FIXED, month: 8, day: 1, regions: CH_STATE_CODES },
  { name: 'Mariä Himmelfahrt', rule: HOLIDAY_RULE.FIXED, month: 8, day: 15, regions: CATHOLIC_CANTONS },
  { name: 'Jeûne genevois', rule: HOLIDAY_RULE.SUNDAY_RELATIVE, month: 9, nthSunday: FIRST_SUNDAY, dayOffset: THURSDAY_AFTER_SUNDAY, regions: [GENEVA] },
  { name: 'Bettagsmontag', rule: HOLIDAY_RULE.SUNDAY_RELATIVE, month: 9, nthSunday: THIRD_SUNDAY, dayOffset: MONDAY_AFTER_SUNDAY, regions: [VAUD] },
  { name: 'Mauritiustag', rule: HOLIDAY_RULE.FIXED, month: 9, day: 22, regions: [APPENZELL_INNERRHODEN] },
  { name: 'Bruder Klaus', rule: HOLIDAY_RULE.FIXED, month: 9, day: 25, regions: [OBWALDEN] },
  { name: 'Allerheiligen', rule: HOLIDAY_RULE.FIXED, month: 11, day: 1, regions: [...CATHOLIC_CANTONS, GLARUS, ST_GALLEN] },
  { name: 'Mariä Empfängnis', rule: HOLIDAY_RULE.FIXED, month: 12, day: 8, regions: [LUCERNE, URI, SCHWYZ, OBWALDEN, NIDWALDEN, ZUG, FRIBOURG, APPENZELL_INNERRHODEN, TICINO, VALAIS] },
  { name: 'Weihnachten', rule: HOLIDAY_RULE.FIXED, month: 12, day: 25, regions: CH_STATE_CODES },
  { name: 'Stephanstag', rule: HOLIDAY_RULE.FIXED, month: 12, day: 26, regions: swissCantonsExcept(VALAIS, VAUD, NEUCHATEL, GENEVA, JURA) },
  { name: 'Restauration de la République', rule: HOLIDAY_RULE.FIXED, month: 12, day: 31, regions: [GENEVA] }
];
