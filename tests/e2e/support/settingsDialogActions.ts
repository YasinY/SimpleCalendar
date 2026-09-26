import type { Page } from '@playwright/test';
import type { Theme } from '@shared/theme';

export const SETTINGS_SELECTORS = {
  OPEN_BUTTON: '#settingsButton',
  OVERLAY: '#settingsOverlay',
  REGION: '[data-settings-region]',
  THEME: '[data-settings-theme]',
  CITY: '[data-settings-city]',
  AUTO_UPDATE: '[data-settings-auto-update]',
  VERSION: '[data-settings-version]',
  CANCEL: '[data-settings-cancel]',
  SUBMIT: '#settingsOverlay button[type="submit"]'
} as const;

export interface SettingsInput {
  region?: string;
  theme?: Theme;
  city?: string;
  autoUpdate?: boolean;
}

export async function openSettings(page: Page): Promise<void> {
  await page.locator(SETTINGS_SELECTORS.OPEN_BUTTON).click();
}

export async function saveSettings(page: Page, { region, theme, city, autoUpdate }: SettingsInput): Promise<void> {
  await openSettings(page);
  if (region !== undefined) await page.locator(SETTINGS_SELECTORS.REGION).selectOption(region);
  if (theme !== undefined) await page.locator(SETTINGS_SELECTORS.THEME).selectOption(theme);
  if (city !== undefined) await page.locator(SETTINGS_SELECTORS.CITY).fill(city);
  if (autoUpdate !== undefined) await page.locator(SETTINGS_SELECTORS.AUTO_UPDATE).setChecked(autoUpdate);
  await page.locator(SETTINGS_SELECTORS.SUBMIT).click();
}
