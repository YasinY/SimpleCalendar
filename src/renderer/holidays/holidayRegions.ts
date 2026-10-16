import type { HolidayCountry } from './holidayCountry';
import type { State } from './state';

export const COUNTRY_CODES = {
  GERMANY: '',
  AUSTRIA: 'AT',
  SWITZERLAND: 'CH'
} as const;

export const GERMAN_STATES: State[] = [
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

export const AUSTRIAN_STATES: State[] = [
  { code: 'AT-1', name: 'Burgenland' },
  { code: 'AT-2', name: 'Kärnten' },
  { code: 'AT-3', name: 'Niederösterreich' },
  { code: 'AT-4', name: 'Oberösterreich' },
  { code: 'AT-5', name: 'Salzburg' },
  { code: 'AT-6', name: 'Steiermark' },
  { code: 'AT-7', name: 'Tirol' },
  { code: 'AT-8', name: 'Vorarlberg' },
  { code: 'AT-9', name: 'Wien' }
];

export const SWISS_CANTONS: State[] = [
  { code: 'CH-AG', name: 'Aargau' },
  { code: 'CH-AR', name: 'Appenzell Ausserrhoden' },
  { code: 'CH-AI', name: 'Appenzell Innerrhoden' },
  { code: 'CH-BL', name: 'Basel-Landschaft' },
  { code: 'CH-BS', name: 'Basel-Stadt' },
  { code: 'CH-BE', name: 'Bern' },
  { code: 'CH-FR', name: 'Freiburg' },
  { code: 'CH-GE', name: 'Genf' },
  { code: 'CH-GL', name: 'Glarus' },
  { code: 'CH-GR', name: 'Graubünden' },
  { code: 'CH-JU', name: 'Jura' },
  { code: 'CH-LU', name: 'Luzern' },
  { code: 'CH-NE', name: 'Neuenburg' },
  { code: 'CH-NW', name: 'Nidwalden' },
  { code: 'CH-OW', name: 'Obwalden' },
  { code: 'CH-SH', name: 'Schaffhausen' },
  { code: 'CH-SZ', name: 'Schwyz' },
  { code: 'CH-SO', name: 'Solothurn' },
  { code: 'CH-SG', name: 'St. Gallen' },
  { code: 'CH-TI', name: 'Tessin' },
  { code: 'CH-TG', name: 'Thurgau' },
  { code: 'CH-UR', name: 'Uri' },
  { code: 'CH-VD', name: 'Waadt' },
  { code: 'CH-VS', name: 'Wallis' },
  { code: 'CH-ZG', name: 'Zug' },
  { code: 'CH-ZH', name: 'Zürich' }
];

function toCodes(states: State[]): string[] {
  return states.map((state) => state.code);
}

export const DE_STATE_CODES = toCodes(GERMAN_STATES);
export const AT_STATE_CODES = toCodes(AUSTRIAN_STATES);
export const CH_STATE_CODES = toCodes(SWISS_CANTONS);

export function swissCantonsExcept(...excluded: string[]): string[] {
  return CH_STATE_CODES.filter((code) => !excluded.includes(code));
}

export const HOLIDAY_COUNTRIES: HolidayCountry[] = [
  { code: COUNTRY_CODES.GERMANY, name: 'Deutschland', nationwideLabel: 'Deutschland (bundesweit)', states: GERMAN_STATES },
  { code: COUNTRY_CODES.AUSTRIA, name: 'Österreich', nationwideLabel: 'Österreich (bundesweit)', states: AUSTRIAN_STATES },
  { code: COUNTRY_CODES.SWITZERLAND, name: 'Schweiz', nationwideLabel: 'Schweiz (national)', states: SWISS_CANTONS }
];

export function findHolidayCountry(regionCode: string): HolidayCountry | undefined {
  return HOLIDAY_COUNTRIES.find((country) => country.code === regionCode);
}
