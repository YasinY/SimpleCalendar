import type { Page } from '@playwright/test';
import type { Theme } from '../../../src/shared/theme';

export const SETTINGS_SELECTORS = {
  OPEN_BUTTON: '#settingsButton',
  OVERLAY: '#settingsOverlay',
  REGION: '[data-settings-region]',
  THEME: '[data-settings-theme]',
  CITY: '[data-settings-city]',
  CANCEL: '[data-settings-cancel]',
  SUBMIT: '#settingsOverlay button[type="submit"]'
} as const;

export interface SettingsInput {
  region?: string;
  theme?: Theme;
  city?: string;
}

export async function openSettings(page: Page): Promise<void> {
  await page.locator(SETTINGS_SELECTORS.OPEN_BUTTON).click();
}

export async function saveSettings(page: Page, { region, theme, city }: SettingsInput): Promise<void> {
  await openSettings(page);
  if (region !== undefined) await page.locator(SETTINGS_SELECTORS.REGION).selectOption(region);
  if (theme !== undefined) await page.locator(SETTINGS_SELECTORS.THEME).selectOption(theme);
  if (city !== undefined) await page.locator(SETTINGS_SELECTORS.CITY).fill(city);
  await page.locator(SETTINGS_SELECTORS.SUBMIT).click();
}
