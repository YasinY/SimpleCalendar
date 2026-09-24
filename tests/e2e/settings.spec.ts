import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ElectronApplication, Page } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import { openSettings, saveSettings, SETTINGS_SELECTORS } from './support/settingsDialogActions';
import { DEFAULT_COORDINATES, mockForecast, mockGeocoding } from './support/weatherRoutes';
import type { Settings } from '../../src/shared/settings';
import type { Theme } from '../../src/shared/theme';

const SETTINGS_FILE_NAME = 'settings.json';
const FILE_ENCODING = 'utf8';
const WEATHER_BADGE = '#weatherBadge';
const HOLIDAY_REGION = 'BY';
const NATIONWIDE_REGION = '';
const SEEDED_CITY = 'Hamburg';
const RAW_CITY = '  Berlin  ';
const TRIMMED_CITY = 'Berlin';
const EMPTY_CITY = '';
const FORECAST = { temperature: 12, code: 0 };

const THEMES = { SYSTEM: 'system', LIGHT: 'light', DARK: 'dark' } as const satisfies Record<string, Theme>;
const THEME_BACKGROUNDS = { light: '#ffffff', dark: '#1c1c1e' } as const;

const THEME_CASES: { theme: Theme; background: string | null }[] = [
  { theme: THEMES.DARK, background: THEME_BACKGROUNDS.dark },
  { theme: THEMES.LIGHT, background: THEME_BACKGROUNDS.light },
  { theme: THEMES.SYSTEM, background: null }
];

function readStoredSettings(userData: string): Settings {
  return JSON.parse(readFileSync(path.join(userData, SETTINGS_FILE_NAME), FILE_ENCODING)) as Settings;
}

function windowBackground(app: ElectronApplication): Promise<string> {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBackgroundColor().toLowerCase());
}

function expectedSystemBackground(app: ElectronApplication): Promise<string> {
  return app.evaluate(({ nativeTheme }, backgrounds) => (nativeTheme.shouldUseDarkColors ? backgrounds.dark : backgrounds.light), THEME_BACKGROUNDS);
}

async function expectDialogValues(page: Page, values: { region: string; theme: Theme; city: string }): Promise<void> {
  await openSettings(page);
  await expect(page.locator(SETTINGS_SELECTORS.REGION)).toHaveValue(values.region);
  await expect(page.locator(SETTINGS_SELECTORS.THEME)).toHaveValue(values.theme);
  await expect(page.locator(SETTINGS_SELECTORS.CITY)).toHaveValue(values.city);
  await page.locator(SETTINGS_SELECTORS.CANCEL).click();
}

test('stores the holiday region and shows it when reopening', async ({ calendar: { page, userData } }) => {
  await saveSettings(page, { region: HOLIDAY_REGION });
  await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();

  await expectDialogValues(page, { region: HOLIDAY_REGION, theme: THEMES.SYSTEM, city: EMPTY_CITY });
  expect(readStoredSettings(userData).holidayRegion).toBe(HOLIDAY_REGION);
});

for (const { theme, background } of THEME_CASES) {
  test('applies the ' + theme + ' theme to the native theme and the window background', async ({ calendar: { page, app } }) => {
    await saveSettings(page, { theme: theme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK });
    await saveSettings(page, { theme });
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();

    await expect.poll(() => app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe(theme);
    const expectedBackground = background ?? (await expectedSystemBackground(app));
    await expect.poll(() => windowBackground(app)).toBe(expectedBackground);
    await expectDialogValues(page, { region: NATIONWIDE_REGION, theme, city: EMPTY_CITY });
  });
}

test('trims the city before saving and shows the trimmed value when reopening', async ({ calendar: { page, userData } }) => {
  await mockGeocoding(page);
  await mockForecast(page, FORECAST);
  await saveSettings(page, { city: RAW_CITY });

  await expect(page.locator(WEATHER_BADGE)).toBeVisible();
  await expectDialogValues(page, { region: NATIONWIDE_REGION, theme: THEMES.SYSTEM, city: TRIMMED_CITY });
  expect(readStoredSettings(userData).weatherCity).toBe(TRIMMED_CITY);
});

test.describe('with a configured city', () => {
  test.use({
    calendarLaunch: {
      ...DEFAULT_LAUNCH_OPTIONS,
      settings: {
        holidayRegion: HOLIDAY_REGION,
        theme: THEMES.DARK,
        weatherCity: SEEDED_CITY,
        weatherLocation: { city: SEEDED_CITY, name: SEEDED_CITY, ...DEFAULT_COORDINATES }
      }
    }
  });

  test('shows the stored values when opening the dialog', async ({ calendar: { page, app } }) => {
    await expectDialogValues(page, { region: HOLIDAY_REGION, theme: THEMES.DARK, city: SEEDED_CITY });
    expect(await app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe(THEMES.DARK);
  });

  test('clearing the city hides the weather badge and stores an empty city', async ({ calendar: { page, userData } }) => {
    await saveSettings(page, { city: EMPTY_CITY });

    await expect(page.locator(WEATHER_BADGE)).toBeHidden();
    await expect.poll(() => readStoredSettings(userData).weatherCity).toBe(EMPTY_CITY);
    await expectDialogValues(page, { region: HOLIDAY_REGION, theme: THEMES.DARK, city: EMPTY_CITY });
  });
});
