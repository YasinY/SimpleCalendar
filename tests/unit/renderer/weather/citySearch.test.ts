import { describe, expect, it } from 'vitest';
import { formatCityDetails, normalizeCityText, searchCities, toCity, toIndexedCity, toWeatherLocation } from '@renderer/weather/citySearch';
import type { CityRow } from '@renderer/weather/cityRow';

const ROWS: Record<string, CityRow> = {
  HAMBURG: ['Hamburg', 'Hamburg', 'DE', 53.55, 9.99, 1800000],
  BERLIN: ['Berlin', 'Berlin', 'DE', 52.52, 13.41, 3400000],
  MUNICH: ['München', 'Bayern', 'DE', 48.14, 11.58, 1260000],
  HAMBURG_US: ['Hamburg', 'New York', 'US', 42.72, -78.83, 10000],
  GIESSEN: ['Gießen', 'Hessen', 'DE', 50.58, 8.67, 90000],
  SINGAPORE: ['Singapore', '', 'SG', 1.29, 103.85, 5600000]
};

const INDEX = [ROWS.SINGAPORE, ROWS.BERLIN, ROWS.HAMBURG, ROWS.MUNICH, ROWS.GIESSEN, ROWS.HAMBURG_US].map(toIndexedCity);
const LIMIT = 8;
const SMALL_LIMIT = 1;
const QUERIES = { HAM: 'ham', PADDED_HAM: '  Ham ', MUEN: 'muen', MUN: 'mün', BURG: 'burg', EMPTY: '', BLANK: '   ', UNKNOWN: 'xyz' } as const;
const NORMALIZED = { MUNICH: 'munchen', GIESSEN: 'giessen', MUNICH_TRANSLITERATED: 'muenchen' } as const;
const DETAILS = { MUNICH: 'Bayern, Deutschland', SINGAPORE: 'Singapur' } as const;

function names(rows: ReturnType<typeof searchCities>): string[] {
  return rows.map((city) => city.name);
}

describe('citySearch', () => {
  it('normalizes case, diacritics and sharp s', () => {
    expect(normalizeCityText('München')).toBe(NORMALIZED.MUNICH);
    expect(normalizeCityText('Gießen')).toBe(NORMALIZED.GIESSEN);
  });

  it('maps rows to cities and indexes them with a transliterated key', () => {
    expect(toCity(ROWS.MUNICH)).toEqual({ name: 'München', region: 'Bayern', country: 'DE', latitude: 48.14, longitude: 11.58 });
    expect(toIndexedCity(ROWS.MUNICH).searchKeys).toEqual([NORMALIZED.MUNICH, NORMALIZED.MUNICH_TRANSLITERATED]);
  });

  it('lists prefix matches in index order before contains matches', () => {
    expect(names(searchCities(INDEX, QUERIES.HAM, LIMIT))).toEqual(['Hamburg', 'Hamburg']);
    expect(names(searchCities(INDEX, QUERIES.BURG, LIMIT))).toEqual(['Hamburg', 'Hamburg']);
    expect(searchCities(INDEX, QUERIES.HAM, LIMIT)[0].country).toBe('DE');
  });

  it('matches umlauts typed as transliteration or with diacritics and trims the query', () => {
    expect(names(searchCities(INDEX, QUERIES.MUEN, LIMIT))).toEqual(['München']);
    expect(names(searchCities(INDEX, QUERIES.MUN, LIMIT))).toEqual(['München']);
    expect(names(searchCities(INDEX, QUERIES.PADDED_HAM, LIMIT))).toEqual(['Hamburg', 'Hamburg']);
  });

  it('stops at the limit and returns nothing for blank or unknown queries', () => {
    expect(names(searchCities(INDEX, QUERIES.HAM, SMALL_LIMIT))).toEqual(['Hamburg']);
    expect(searchCities(INDEX, QUERIES.EMPTY, LIMIT)).toEqual([]);
    expect(searchCities(INDEX, QUERIES.BLANK, LIMIT)).toEqual([]);
    expect(searchCities(INDEX, QUERIES.UNKNOWN, LIMIT)).toEqual([]);
  });

  it('formats region and german country name, skipping an empty region', () => {
    expect(formatCityDetails(toCity(ROWS.MUNICH))).toBe(DETAILS.MUNICH);
    expect(formatCityDetails(toCity(ROWS.SINGAPORE))).toBe(DETAILS.SINGAPORE);
  });

  it('converts a city into a weather location', () => {
    expect(toWeatherLocation(toCity(ROWS.HAMBURG))).toEqual({ city: 'Hamburg', name: 'Hamburg', latitude: 53.55, longitude: 9.99 });
  });
});
