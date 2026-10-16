import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ElectronApplication, Page } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import { openSettings, saveSettings, SETTINGS_SELECTORS, typeCity } from './support/settingsDialogActions';
import { HAMBURG_COORDINATES, mockForecast } from './support/weatherRoutes';
import { PROJECT_ROOT } from './support/coveragePaths';
import type { Settings } from '@shared/settings';
import type { Theme } from '@shared/theme';

const SETTINGS_FILE_NAME = 'settings.json';
const PACKAGE_FILE_NAME = 'package.json';
const FILE_ENCODING = 'utf8';
const VERSION_PREFIX = 'SimpleCalendar ';
const packageVersion = (JSON.parse(readFileSync(path.join(PROJECT_ROOT, PACKAGE_FILE_NAME), FILE_ENCODING)) as { version: string }).version;
const WEATHER_BADGE = '#weatherBadge';
const HOLIDAY_REGION = 'BY';
const NATIONWIDE_REGION = '';
const SEEDED_CITY = 'Hamburg';
const RAW_CITY = '  Berlin  ';
const TRIMMED_CITY = 'Berlin';
const EMPTY_CITY = '';
const REGION_GROUP_COUNT = 3;
const LABEL_ATTRIBUTE = 'label';
const AUSTRIA_LABEL = 'Österreich';
const AUSTRIA_NATIONWIDE_LABEL = 'Österreich (bundesweit)';
const CITY_QUERY = 'Hamb';
const AMBIGUOUS_QUERY = 'Neustadt';
const UNKNOWN_QUERY = 'Nirgendwoheim';
const ESCAPE_KEY = 'Escape';
const ARROW_DOWN_KEY = 'ArrowDown';
const ARROW_UP_KEY = 'ArrowUp';
const ENTER_KEY = 'Enter';
const HAMBURG_DETAILS = 'Hamburg, Deutschland';
const LARGEST_LOCAL_CITY = 'Berlin';
const RENDERED_WINDOW = 16;
const SUGGESTION_ATTRIBUTE = 'aria-expanded';
const EXPANDED = 'true';
const COLLAPSED = 'false';
const KEEP_TEXT = false;
const FORECAST = { temperature: 12, code: 0 };
const TRANSITION_LOG_KEY = 'settingsTransitionLog';
const SETTINGS_ICON = SETTINGS_SELECTORS.OPEN_BUTTON + ' svg';
const SETTINGS_ICON_ROTATION = '90deg';
const UNROTATED = 'none';
const ANIMATED_PROPERTIES = ['opacity', 'scale', 'translate', 'rotate'];

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

async function startTransitionLog(page: Page): Promise<void> {
  await page.evaluate((logKey) => {
    const log: string[] = [];
    Object.assign(window, { [logKey]: log });
    document.addEventListener('transitionrun', (domEvent) => log.push(domEvent.propertyName));
  }, TRANSITION_LOG_KEY);
}

function readTransitionLog(page: Page): Promise<string[]> {
  return page.evaluate((logKey) => (window as unknown as Record<string, string[]>)[logKey], TRANSITION_LOG_KEY);
}

function clearTransitionLog(page: Page): Promise<void> {
  return page.evaluate((logKey) => {
    (window as unknown as Record<string, string[]>)[logKey].length = 0;
  }, TRANSITION_LOG_KEY);
}

function readIconRotation(page: Page): Promise<string> {
  return page.locator(SETTINGS_ICON).evaluate((icon) => getComputedStyle(icon).rotate);
}

async function expectDialogValues(page: Page, values: { region: string; theme: Theme; city: string }): Promise<void> {
  await openSettings(page);
  await expect(page.locator(SETTINGS_SELECTORS.REGION)).toHaveValue(values.region);
  await expect(page.locator(SETTINGS_SELECTORS.THEME)).toHaveValue(values.theme);
  await expect(page.locator(SETTINGS_SELECTORS.CITY)).toHaveValue(values.city);
  await page.locator(SETTINGS_SELECTORS.CANCEL).click();
}

test('groups the holiday regions by country', async ({ calendar: { page } }) => {
  await openSettings(page);
  const groups = page.locator(SETTINGS_SELECTORS.REGION + ' optgroup');

  await expect(groups).toHaveCount(REGION_GROUP_COUNT);
  await expect(groups.nth(1)).toHaveAttribute(LABEL_ATTRIBUTE, AUSTRIA_LABEL);
  await expect(groups.nth(1).locator('option').first()).toHaveText(AUSTRIA_NATIONWIDE_LABEL);
});

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

test('stores the picked city name instead of the raw text', async ({ calendar: { page, userData } }) => {
  await mockForecast(page, FORECAST);
  await saveSettings(page, { city: RAW_CITY });

  await expect(page.locator(WEATHER_BADGE)).toBeVisible();
  await expectDialogValues(page, { region: NATIONWIDE_REGION, theme: THEMES.SYSTEM, city: TRIMMED_CITY });
  expect(readStoredSettings(userData).weatherCity).toBe(TRIMMED_CITY);
});

test('enables auto update by default and stores it when disabled', async ({ calendar: { page, userData } }) => {
  await openSettings(page);
  await expect(page.locator(SETTINGS_SELECTORS.AUTO_UPDATE)).toBeChecked();
  await page.locator(SETTINGS_SELECTORS.CANCEL).click();

  await saveSettings(page, { autoUpdate: false });
  await expect.poll(() => readStoredSettings(userData).autoUpdate).toBe(false);
  await openSettings(page);
  await expect(page.locator(SETTINGS_SELECTORS.AUTO_UPDATE)).not.toBeChecked();
});

test.describe('with auto update disabled', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, settings: { autoUpdate: false } } });

  test('shows the disabled auto update and stores it when enabled again', async ({ calendar: { page, userData } }) => {
    await openSettings(page);
    await expect(page.locator(SETTINGS_SELECTORS.AUTO_UPDATE)).not.toBeChecked();
    await page.locator(SETTINGS_SELECTORS.CANCEL).click();

    await saveSettings(page, { autoUpdate: true });
    await expect.poll(() => readStoredSettings(userData).autoUpdate).toBe(true);
  });
});

test.describe('with a configured city', () => {
  test.use({
    calendarLaunch: {
      ...DEFAULT_LAUNCH_OPTIONS,
      settings: {
        holidayRegion: HOLIDAY_REGION,
        theme: THEMES.DARK,
        weatherCity: SEEDED_CITY,
        weatherLocation: { city: SEEDED_CITY, name: SEEDED_CITY, ...HAMBURG_COORDINATES }
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

test('shows the app version in the settings dialog', async ({ calendar: { page } }) => {
  await openSettings(page);
  await expect(page.locator(SETTINGS_SELECTORS.VERSION)).toHaveText(VERSION_PREFIX + packageVersion);
});

test.describe('animation', () => {
  test('animates the dialog and rotates the gear icon when opening and closing', async ({ calendar: { page } }) => {
    await startTransitionLog(page);

    await openSettings(page);
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeVisible();
    await expect.poll(() => readTransitionLog(page)).toEqual(expect.arrayContaining(ANIMATED_PROPERTIES));
    await expect.poll(() => readIconRotation(page)).toBe(SETTINGS_ICON_ROTATION);

    await clearTransitionLog(page);
    await page.locator(SETTINGS_SELECTORS.CANCEL).click();
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();
    await expect.poll(() => readTransitionLog(page)).toEqual(expect.arrayContaining(ANIMATED_PROPERTIES));
    await expect.poll(() => readIconRotation(page)).toBe(UNROTATED);
  });

  test('opens and closes without animation when reduced motion is preferred', async ({ calendar: { page } }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startTransitionLog(page);

    await openSettings(page);
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeVisible();
    expect(await readIconRotation(page)).toBe(SETTINGS_ICON_ROTATION);
    await page.locator(SETTINGS_SELECTORS.CANCEL).click();
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();

    expect(await readTransitionLog(page)).toEqual([]);
  });
});

test.describe('city suggestions', () => {
  test('opens the full list from the trigger and filters it with region and country while typing', async ({ calendar: { page } }) => {
    await openSettings(page);
    const cityInput = page.locator(SETTINGS_SELECTORS.CITY);
    const picker = page.locator(SETTINGS_SELECTORS.CITY_PICKER);
    const options = page.locator(SETTINGS_SELECTORS.CITY_OPTION);

    await page.locator(SETTINGS_SELECTORS.CITY_TRIGGER).click();
    await expect(picker).toBeVisible();
    await expect(cityInput).toBeFocused();
    await expect(options.first().locator(SETTINGS_SELECTORS.CITY_OPTION_NAME)).toHaveText(LARGEST_LOCAL_CITY);
    await expect(options).toHaveCount(RENDERED_WINDOW);
    await page.locator(SETTINGS_SELECTORS.CITY_TRIGGER).click();
    await expect(picker).toBeHidden();

    await cityInput.fill(CITY_QUERY);
    await expect(picker).toBeVisible();
    await expect(cityInput).toHaveAttribute(SUGGESTION_ATTRIBUTE, EXPANDED);
    await expect(options.first().locator(SETTINGS_SELECTORS.CITY_OPTION_NAME)).toHaveText(SEEDED_CITY);
    await expect(options.first().locator(SETTINGS_SELECTORS.CITY_OPTION_DETAILS)).toHaveText(HAMBURG_DETAILS);

    await cityInput.fill(AMBIGUOUS_QUERY);
    await expect(options.first().locator(SETTINGS_SELECTORS.CITY_OPTION_NAME)).toContainText(AMBIGUOUS_QUERY);

    await cityInput.fill(UNKNOWN_QUERY);
    await expect(page.locator(SETTINGS_SELECTORS.CITY_PICKER)).toBeHidden();
    await expect(cityInput).toHaveAttribute(SUGGESTION_ATTRIBUTE, COLLAPSED);
  });

  test('picks a suggestion with the keyboard and closes the list with escape without closing the dialog', async ({ calendar: { page, userData } }) => {
    await mockForecast(page, FORECAST);
    await openSettings(page);
    const cityInput = page.locator(SETTINGS_SELECTORS.CITY);

    await cityInput.fill(CITY_QUERY);
    await expect(page.locator(SETTINGS_SELECTORS.CITY_PICKER)).toBeVisible();
    await page.keyboard.press(ESCAPE_KEY);
    await expect(page.locator(SETTINGS_SELECTORS.CITY_PICKER)).toBeHidden();
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeVisible();

    await typeCity(page, CITY_QUERY, KEEP_TEXT);
    await page.keyboard.press(ARROW_DOWN_KEY);
    await page.keyboard.press(ARROW_UP_KEY);
    await page.keyboard.press(ENTER_KEY);
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeVisible();
    await expect(cityInput).toHaveValue(SEEDED_CITY);

    await page.locator(SETTINGS_SELECTORS.SUBMIT).click();
    await expect(page.locator(WEATHER_BADGE)).toBeVisible();
    await expect.poll(() => readStoredSettings(userData).weatherLocation?.name).toBe(SEEDED_CITY);
  });
});
