import type { Page } from '@playwright/test';
import type { Theme } from '@shared/theme';

export const SETTINGS_SELECTORS = {
  OPEN_BUTTON: '#settingsButton',
  OVERLAY: '#settingsOverlay',
  REGION: '[data-settings-region]',
  THEME: '[data-settings-theme]',
  CITY: '[data-settings-city]',
  CITY_PICKER: '#cityPicker',
  CITY_TRIGGER: '[data-city-picker-trigger]',
  CITY_OPTION: '#cityPicker .city-picker__option',
  CITY_OPTION_NAME: '.city-picker__name',
  CITY_OPTION_DETAILS: '.city-picker__details',
  AUTO_UPDATE: '[data-settings-auto-update]',
  VERSION: '[data-settings-version]',
  CANCEL: '[data-settings-cancel]',
  SUBMIT: '#settingsOverlay button[type="submit"]'
} as const;

const EMPTY_CITY = '';

export interface SettingsInput {
  region?: string;
  theme?: Theme;
  city?: string;
  pickSuggestion?: boolean;
  autoUpdate?: boolean;
}

export async function openSettings(page: Page): Promise<void> {
  await page.locator(SETTINGS_SELECTORS.OPEN_BUTTON).click();
}

export async function typeCity(page: Page, city: string, pickSuggestion: boolean): Promise<void> {
  await page.locator(SETTINGS_SELECTORS.CITY).fill(city);
  if (city === EMPTY_CITY || !pickSuggestion) return;
  await page.locator(SETTINGS_SELECTORS.CITY_OPTION).first().click();
}

export async function saveSettings(page: Page, { region, theme, city, pickSuggestion = true, autoUpdate }: SettingsInput): Promise<void> {
  await openSettings(page);
  if (region !== undefined) await page.locator(SETTINGS_SELECTORS.REGION).selectOption(region);
  if (theme !== undefined) await page.locator(SETTINGS_SELECTORS.THEME).selectOption(theme);
  if (city !== undefined) await typeCity(page, city, pickSuggestion);
  if (autoUpdate !== undefined) await page.locator(SETTINGS_SELECTORS.AUTO_UPDATE).setChecked(autoUpdate);
  await page.locator(SETTINGS_SELECTORS.SUBMIT).click();
}
