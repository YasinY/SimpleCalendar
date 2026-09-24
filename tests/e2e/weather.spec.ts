import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import { saveSettings } from './support/settingsDialogActions';
import {
  DEFAULT_COORDINATES,
  failRoute,
  FORECAST_ROUTE,
  GEOCODING_ROUTE,
  mockEmptyGeocoding,
  mockForecast,
  mockGeocoding,
  type RouteFailure
} from './support/weatherRoutes';
import { UNKNOWN_CONDITION, WEATHER_CONDITIONS, WEATHER_REFRESH_INTERVAL_MS } from '../../src/renderer/weather/weatherConstants';
import type { Settings } from '../../src/shared/settings';

const SELECTORS = {
  BADGE: '#weatherBadge',
  ICON_SVG: '[data-weather-icon] svg',
  TEMPERATURE: '[data-weather-temp]',
  LABEL: '[data-weather-label]'
} as const;

const SETTINGS_FILE_NAME = 'settings.json';
const FILE_ENCODING = 'utf8';
const FOCUS_EVENT = 'focus';
const TITLE_ATTRIBUTE = 'title';
const TOOLTIP_SEPARATOR = ' · ';
const TEMPERATURE_SUFFIX = '°';
const LATITUDE_PARAMETER = 'latitude';
const LONGITUDE_PARAMETER = 'longitude';
const CITY = 'Hamburg';
const CACHED_CITY = 'Lübeck';
const UNKNOWN_WEATHER_CODE = 42;
const OVERCAST_CODE = 3;
const OVERCAST_LABEL = 'Bedeckt';
const RAW_TEMPERATURE = 18.6;
const ROUNDED_TEMPERATURE = '19';
const CITY_PREFIX = 'Stadt ';
const GEOCODING_WARNING = 'weather geocoding failed';
const FORECAST_WARNING = 'weather fetch failed';
const FAILURES: RouteFailure[] = ['serverError', 'networkError'];

const CACHED_SETTINGS: Partial<Settings> = {
  weatherCity: CACHED_CITY,
  weatherLocation: { city: CACHED_CITY, name: CACHED_CITY, ...DEFAULT_COORDINATES }
};

const CONDITION_CASES = [
  ...WEATHER_CONDITIONS.map(({ codes, label }) => ({ code: codes[0], label })),
  { code: UNKNOWN_WEATHER_CODE, label: UNKNOWN_CONDITION.label }
];

function readStoredSettings(userData: string): Settings {
  return JSON.parse(readFileSync(path.join(userData, SETTINGS_FILE_NAME), FILE_ENCODING)) as Settings;
}

function expectedLabel(conditionLabel: string, locationName: string): string {
  return conditionLabel + TOOLTIP_SEPARATOR + locationName;
}

async function waitForWarning(page: Page, text: string): Promise<void> {
  await page.waitForEvent('console', (message) => message.text().includes(text));
}

async function dispatchWindowFocus(page: Page): Promise<void> {
  await page.evaluate((eventName) => window.dispatchEvent(new Event(eventName)), FOCUS_EVENT);
}

test('keeps the badge hidden without a configured city', async ({ calendar: { page } }) => {
  const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
  await dispatchWindowFocus(page);

  await expect(page.locator(SELECTORS.BADGE)).toBeHidden();
  expect(forecastUrls).toHaveLength(0);
});

test('saving a city geocodes it and renders the current weather', async ({ calendar: { page, userData } }) => {
  const requestedCities = await mockGeocoding(page);
  const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
  await saveSettings(page, { city: CITY });

  const badge = page.locator(SELECTORS.BADGE);
  const label = expectedLabel(OVERCAST_LABEL, CITY);
  await expect(badge).toBeVisible();
  await expect(badge.locator(SELECTORS.TEMPERATURE)).toHaveText(ROUNDED_TEMPERATURE + TEMPERATURE_SUFFIX);
  await expect(badge.locator(SELECTORS.LABEL)).toHaveText(label);
  await expect(badge).toHaveAttribute(TITLE_ATTRIBUTE, label);
  await expect(badge.locator(SELECTORS.ICON_SVG)).toHaveCount(1);

  expect(requestedCities).toEqual([CITY]);
  const [forecastUrl] = forecastUrls;
  expect(forecastUrl.searchParams.get(LATITUDE_PARAMETER)).toBe(String(DEFAULT_COORDINATES.latitude));
  expect(forecastUrl.searchParams.get(LONGITUDE_PARAMETER)).toBe(String(DEFAULT_COORDINATES.longitude));
  await expect.poll(() => readStoredSettings(userData).weatherLocation).toEqual({ city: CITY, name: CITY, ...DEFAULT_COORDINATES });
});

test('skips a focus refresh within the stale time', async ({ calendar: { page } }) => {
  await mockGeocoding(page);
  const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
  await saveSettings(page, { city: CITY });
  await expect(page.locator(SELECTORS.BADGE)).toBeVisible();

  await dispatchWindowFocus(page);
  await expect(page.locator(SELECTORS.BADGE)).toBeVisible();
  expect(forecastUrls).toHaveLength(1);
});

test('resolves every weather condition group including unknown codes', async ({ calendar: { page } }) => {
  await mockGeocoding(page);
  const forecast = { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE };
  await mockForecast(page, forecast);

  for (const [index, { code, label }] of CONDITION_CASES.entries()) {
    const city = CITY_PREFIX + index;
    forecast.code = code;
    await saveSettings(page, { city });
    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(label, city));
    await expect(page.locator(SELECTORS.ICON_SVG)).toHaveCount(1);
  }
});

test('keeps the badge hidden when the city is not found', async ({ calendar: { page, userData } }) => {
  await mockEmptyGeocoding(page);
  const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
  await saveSettings(page, { city: CITY });

  await expect.poll(() => readStoredSettings(userData).weatherCity).toBe(CITY);
  await dispatchWindowFocus(page);
  await expect(page.locator(SELECTORS.BADGE)).toBeHidden();
  expect(readStoredSettings(userData).weatherLocation).toBeNull();
  expect(forecastUrls).toHaveLength(0);
});

for (const failure of FAILURES) {
  test('keeps the badge hidden when geocoding fails with a ' + failure, async ({ calendar: { page } }) => {
    await failRoute(page, GEOCODING_ROUTE, failure);
    const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
    const warning = waitForWarning(page, GEOCODING_WARNING);
    await saveSettings(page, { city: CITY });
    await warning;

    await expect(page.locator(SELECTORS.BADGE)).toBeHidden();
    expect(forecastUrls).toHaveLength(0);
  });

  test('keeps the badge hidden when the forecast fails with a ' + failure, async ({ calendar: { page, userData } }) => {
    await mockGeocoding(page);
    await failRoute(page, FORECAST_ROUTE, failure);
    const warning = waitForWarning(page, FORECAST_WARNING);
    await saveSettings(page, { city: CITY });
    await warning;

    await expect.poll(() => readStoredSettings(userData).weatherLocation?.city).toBe(CITY);
    await expect(page.locator(SELECTORS.BADGE)).toBeHidden();
  });
}

test.describe('with a cached location', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, settings: CACHED_SETTINGS } });

  test('uses the cached location of the same city without geocoding', async ({ calendar: { page } }) => {
    const requestedCities = await mockGeocoding(page);
    const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
    await page.reload();

    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(OVERCAST_LABEL, CACHED_CITY));
    expect(requestedCities).toHaveLength(0);
    expect(forecastUrls).toHaveLength(1);
  });

  test('refreshes the weather on the periodic interval', async ({ calendar: { page } }) => {
    await mockGeocoding(page);
    const forecast = { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE };
    const forecastUrls = await mockForecast(page, forecast);
    await page.clock.install();
    await page.reload();
    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(OVERCAST_LABEL, CACHED_CITY));

    forecast.code = UNKNOWN_WEATHER_CODE;
    await page.clock.runFor(WEATHER_REFRESH_INTERVAL_MS);
    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(UNKNOWN_CONDITION.label, CACHED_CITY));
    expect(forecastUrls).toHaveLength(2);
  });
});
