export const CITY_ROW_COLUMNS = {
  NAME: 0,
  REGION: 1,
  COUNTRY: 2,
  LATITUDE: 3,
  LONGITUDE: 4
} as const;

export const COUNTRY_NAME_LOCALE = 'de';
export const COUNTRY_NAME_TYPE = 'region';
export const CITY_DETAILS_SEPARATOR = ', ';
export const LOCAL_COUNTRIES = ['DE', 'AT', 'CH'];
export const NO_CITY_TEXT = '';
export const CANONICAL_DECOMPOSITION = 'NFD';
export const COMBINING_MARKS = /\p{M}/gu;
export const SHARP_S = /ß/g;
export const SHARP_S_REPLACEMENT = 'ss';
export const UMLAUT_TRANSLITERATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/ä/g, 'ae'],
  [/ö/g, 'oe'],
  [/ü/g, 'ue']
];
