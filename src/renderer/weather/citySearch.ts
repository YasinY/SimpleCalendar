import {
  CANONICAL_DECOMPOSITION,
  CITY_DETAILS_SEPARATOR,
  CITY_ROW_COLUMNS,
  COMBINING_MARKS,
  COUNTRY_NAME_LOCALE,
  COUNTRY_NAME_TYPE,
  LOCAL_COUNTRIES,
  NO_CITY_TEXT,
  SHARP_S,
  SHARP_S_REPLACEMENT,
  UMLAUT_TRANSLITERATIONS
} from './cityConstants';
import type { City } from './city';
import type { CityRow } from './cityRow';
import type { CityIndex, IndexedCity } from './indexedCity';
import type { WeatherLocation } from '@shared/weatherLocation';

const countryNames = new Intl.DisplayNames([COUNTRY_NAME_LOCALE], { type: COUNTRY_NAME_TYPE });

function stripDiacritics(text: string): string {
  return text.normalize(CANONICAL_DECOMPOSITION).replace(COMBINING_MARKS, NO_CITY_TEXT);
}

function transliterateUmlauts(text: string): string {
  return UMLAUT_TRANSLITERATIONS.reduce((result, [umlaut, replacement]) => result.replace(umlaut, replacement), text);
}

export function normalizeCityText(text: string): string {
  return stripDiacritics(text.toLowerCase().replace(SHARP_S, SHARP_S_REPLACEMENT));
}

export function toCity(row: CityRow): City {
  return {
    name: row[CITY_ROW_COLUMNS.NAME],
    region: row[CITY_ROW_COLUMNS.REGION],
    country: row[CITY_ROW_COLUMNS.COUNTRY],
    latitude: row[CITY_ROW_COLUMNS.LATITUDE],
    longitude: row[CITY_ROW_COLUMNS.LONGITUDE]
  };
}

export function toIndexedCity(row: CityRow): IndexedCity {
  const city = toCity(row);
  const lowerName = city.name.toLowerCase().replace(SHARP_S, SHARP_S_REPLACEMENT);
  return { city, searchKeys: [stripDiacritics(lowerName), stripDiacritics(transliterateUmlauts(lowerName))] };
}

function isLocal(city: City): boolean {
  return LOCAL_COUNTRIES.includes(city.country);
}

export function sortLocalFirst(index: CityIndex): CityIndex {
  return [...index.filter(({ city }) => isLocal(city)), ...index.filter(({ city }) => !isLocal(city))];
}

export function searchCities(index: CityIndex, query: string): City[] {
  const needle = normalizeCityText(query.trim());
  if (needle === NO_CITY_TEXT) return index.map(({ city }) => city);
  const prefixMatches: City[] = [];
  const containsMatches: City[] = [];
  for (const { city, searchKeys } of index) {
    if (searchKeys.some((key) => key.startsWith(needle))) prefixMatches.push(city);
    else if (searchKeys.some((key) => key.includes(needle))) containsMatches.push(city);
  }
  return [...prefixMatches, ...containsMatches];
}

export function formatCityDetails(city: City): string {
  const countryName = countryNames.of(city.country) as string;
  return [city.region, countryName].filter((part) => part !== NO_CITY_TEXT).join(CITY_DETAILS_SEPARATOR);
}

export function toWeatherLocation(city: City): WeatherLocation {
  return { city: city.name, name: city.name, latitude: city.latitude, longitude: city.longitude };
}
