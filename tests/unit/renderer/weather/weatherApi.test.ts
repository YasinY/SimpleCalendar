import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCurrentWeather, geocodeCity, resolveCondition } from '../../../../src/renderer/weather/weatherApi';
import {
  FORECAST_ENDPOINT,
  FORECAST_PARAMS,
  GEOCODING_ENDPOINT,
  GEOCODING_PARAMS,
  UNKNOWN_CONDITION,
  WEATHER_CONDITIONS
} from '../../../../src/renderer/weather/weatherConstants';
import type { WeatherLocation } from '../../../../src/shared/weatherLocation';

const CITY = 'muenchen';
const RESOLVED_NAME = 'München';
const LATITUDE = 48.137;
const LONGITUDE = 11.575;
const TEMPERATURE = 17.4;
const WEATHER_CODE = 61;
const UNKNOWN_CODE = -1;
const STATUS_TEXT = 'Service Unavailable';
const LOCATION: WeatherLocation = { city: CITY, name: RESOLVED_NAME, latitude: LATITUDE, longitude: LONGITUDE };

function jsonResponse(body: unknown): Response {
  return { ok: true, statusText: '', json: () => Promise.resolve(body) } as Response;
}

function readRequestedUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  return fetchMock.mock.calls[0][0] as URL;
}

function expectQuery(url: URL, expected: Record<string, string>): void {
  expect(Object.fromEntries(url.searchParams)).toEqual(expected);
}

describe('weatherApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('geocodes a city to the first result', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [{ name: RESOLVED_NAME, latitude: LATITUDE, longitude: LONGITUDE }] }));
    await expect(geocodeCity(CITY)).resolves.toEqual(LOCATION);

    const url = readRequestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe(GEOCODING_ENDPOINT);
    expectQuery(url, { ...GEOCODING_PARAMS, name: CITY });
  });

  it('returns null when the geocoding response has no results', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(geocodeCity(CITY)).resolves.toBeNull();
  });

  it('returns null when the geocoding results are empty', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    await expect(geocodeCity(CITY)).resolves.toBeNull();
  });

  it('fetches the current weather for a location', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ current: { temperature_2m: TEMPERATURE, weather_code: WEATHER_CODE } }));
    await expect(fetchCurrentWeather(LOCATION)).resolves.toEqual({ temperature: TEMPERATURE, code: WEATHER_CODE });

    const url = readRequestedUrl(fetchMock);
    expect(url.origin + url.pathname).toBe(FORECAST_ENDPOINT);
    expectQuery(url, { ...FORECAST_PARAMS, latitude: String(LATITUDE), longitude: String(LONGITUDE) });
  });

  it('throws the status text when the response is not ok', async () => {
    fetchMock.mockResolvedValue({ ok: false, statusText: STATUS_TEXT } as Response);
    await expect(fetchCurrentWeather(LOCATION)).rejects.toThrow(STATUS_TEXT);
  });

  it('resolves known codes to their condition', () => {
    const rain = WEATHER_CONDITIONS.find((condition) => condition.codes.includes(WEATHER_CODE));
    expect(resolveCondition(WEATHER_CODE)).toBe(rain);
  });

  it('falls back to the unknown condition', () => {
    expect(resolveCondition(UNKNOWN_CODE)).toBe(UNKNOWN_CONDITION);
  });
});
