import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import { saveSettings } from './support/settingsDialogActions';
import { failRoute, FORECAST_ROUTE, HAMBURG_COORDINATES, mockForecast, type RouteFailure } from './support/weatherRoutes';
import { UNKNOWN_CONDITION, WEATHER_CONDITIONS, WEATHER_REFRESH_INTERVAL_MS } from '@renderer/weather/weatherConstants';
import type { Settings } from '@shared/settings';

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
const STORED_CITY = 'Lübeck';
const UNKNOWN_CITY = 'Nirgendwoheim';
const UNKNOWN_WEATHER_CODE = 42;
const OVERCAST_CODE = 3;
const OVERCAST_LABEL = 'Bedeckt';
const RAW_TEMPERATURE = 18.6;
const ROUNDED_TEMPERATURE = '19';
const FORECAST_WARNING = 'weather fetch failed';
const FAILURES: RouteFailure[] = ['serverError', 'networkError'];
const CONDITION_CITIES = ['Hamburg', 'Berlin', 'München', 'Köln', 'Frankfurt am Main', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Hannover'];

const STORED_SETTINGS: Partial<Settings> = {
  weatherCity: STORED_CITY,
  weatherLocation: { city: STORED_CITY, name: STORED_CITY, latitude: 53.87, longitude: 10.69 }
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

test('saving a picked city renders the current weather for its coordinates', async ({ calendar: { page, userData } }) => {
  const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
  await saveSettings(page, { city: CITY });

  const badge = page.locator(SELECTORS.BADGE);
  const label = expectedLabel(OVERCAST_LABEL, CITY);
  await expect(badge).toBeVisible();
  await expect(badge.locator(SELECTORS.TEMPERATURE)).toHaveText(ROUNDED_TEMPERATURE + TEMPERATURE_SUFFIX);
  await expect(badge.locator(SELECTORS.LABEL)).toHaveText(label);
  await expect(badge).toHaveAttribute(TITLE_ATTRIBUTE, label);
  await expect(badge.locator(SELECTORS.ICON_SVG)).toHaveCount(1);

  const [forecastUrl] = forecastUrls;
  expect(forecastUrl.searchParams.get(LATITUDE_PARAMETER)).toBe(String(HAMBURG_COORDINATES.latitude));
  expect(forecastUrl.searchParams.get(LONGITUDE_PARAMETER)).toBe(String(HAMBURG_COORDINATES.longitude));
  await expect.poll(() => readStoredSettings(userData).weatherLocation).toEqual({ city: CITY, name: CITY, ...HAMBURG_COORDINATES });
});

test('skips a focus refresh within the stale time', async ({ calendar: { page } }) => {
  const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
  await saveSettings(page, { city: CITY });
  await expect(page.locator(SELECTORS.BADGE)).toBeVisible();

  await dispatchWindowFocus(page);
  await expect(page.locator(SELECTORS.BADGE)).toBeVisible();
  expect(forecastUrls).toHaveLength(1);
});

test('resolves every weather condition group including unknown codes', async ({ calendar: { page } }) => {
  const forecast = { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE };
  await mockForecast(page, forecast);

  for (const [index, { code, label }] of CONDITION_CASES.entries()) {
    const city = CONDITION_CITIES[index];
    forecast.code = code;
    await saveSettings(page, { city });
    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(label, city));
    await expect(page.locator(SELECTORS.ICON_SVG)).toHaveCount(1);
  }
});

test('keeps the badge hidden when the city is not in the catalog', async ({ calendar: { page, userData } }) => {
  const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
  await saveSettings(page, { city: UNKNOWN_CITY, pickSuggestion: false });

  await expect.poll(() => readStoredSettings(userData).weatherCity).toBe(UNKNOWN_CITY);
  await dispatchWindowFocus(page);
  await expect(page.locator(SELECTORS.BADGE)).toBeHidden();
  expect(readStoredSettings(userData).weatherLocation).toBeNull();
  expect(forecastUrls).toHaveLength(0);
});

for (const failure of FAILURES) {
  test('keeps the badge hidden when the forecast fails with a ' + failure, async ({ calendar: { page, userData } }) => {
    await failRoute(page, FORECAST_ROUTE, failure);
    const warning = waitForWarning(page, FORECAST_WARNING);
    await saveSettings(page, { city: CITY });
    await warning;

    await expect.poll(() => readStoredSettings(userData).weatherLocation?.city).toBe(CITY);
    await expect(page.locator(SELECTORS.BADGE)).toBeHidden();
  });
}

test.describe('with a stored location', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, settings: STORED_SETTINGS } });

  test('fetches the weather for the stored location on start', async ({ calendar: { page } }) => {
    const forecastUrls = await mockForecast(page, { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE });
    await page.reload();

    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(OVERCAST_LABEL, STORED_CITY));
    expect(forecastUrls).toHaveLength(1);
  });

  test('refreshes the weather on the periodic interval', async ({ calendar: { page } }) => {
    const forecast = { temperature: RAW_TEMPERATURE, code: OVERCAST_CODE };
    const forecastUrls = await mockForecast(page, forecast);
    await page.clock.install();
    await page.reload();
    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(OVERCAST_LABEL, STORED_CITY));

    forecast.code = UNKNOWN_WEATHER_CODE;
    await page.clock.runFor(WEATHER_REFRESH_INTERVAL_MS);
    await expect(page.locator(SELECTORS.LABEL)).toHaveText(expectedLabel(UNKNOWN_CONDITION.label, STORED_CITY));
    expect(forecastUrls).toHaveLength(2);
  });
});
