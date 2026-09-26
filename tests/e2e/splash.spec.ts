import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type ElectronApplication } from '@playwright/test';
import { PROJECT_ROOT } from './support/coveragePaths';
import { countWindows, findSplashPage } from './support/splashWindow';
import {
  createUserData,
  DEFAULT_USER_DATA_LAUNCH_OPTIONS,
  launchElectronInUserData,
  quitAndWaitForExit,
  removeUserData
} from './support/userDataLaunch';

const PACKAGE_FILE_NAME = 'package.json';
const SETTINGS_FILE_NAME = 'settings.json';
const FILE_ENCODING = 'utf8';
const LONG_SPLASH_MS = 60000;
const SPLASH_AND_MAIN_WINDOW = 2;
const SELECTORS = { LOGO: '#logo', STATUS: '#statusText', VERSION: '#versionLabel', PROGRESS: '#progress' } as const;
const BUSY_CLASS_PATTERN = /logo--busy/;
const VERSION_PREFIX = 'Version ';
const UP_TO_DATE_TEXT = 'Alles aktuell';
const STARTING_TEXT = 'Starte …';

const packageVersion = (JSON.parse(readFileSync(path.join(PROJECT_ROOT, PACKAGE_FILE_NAME), FILE_ENCODING)) as { version: string }).version;

async function launchWithLongSplash(files: Record<string, string>): Promise<{ app: ElectronApplication; userData: string }> {
  const userData = createUserData(files);
  const app = await launchElectronInUserData(userData, { ...DEFAULT_USER_DATA_LAUNCH_OPTIONS, splashMinimumMs: LONG_SPLASH_MS });
  return { app, userData };
}

async function quitAndClean({ app, userData }: { app: ElectronApplication; userData: string }): Promise<void> {
  await quitAndWaitForExit(app);
  removeUserData(userData);
}

test('shows the splash with the app version and the update result next to the hidden main window', async () => {
  const running = await launchWithLongSplash({});
  const splash = await findSplashPage(running.app);

  await expect(splash.locator(SELECTORS.VERSION)).toHaveText(VERSION_PREFIX + packageVersion);
  await expect(splash.locator(SELECTORS.STATUS)).toHaveText(UP_TO_DATE_TEXT);
  await expect(splash.locator(SELECTORS.LOGO)).not.toHaveClass(BUSY_CLASS_PATTERN);
  await expect(splash.locator(SELECTORS.PROGRESS)).toBeHidden();
  expect(await countWindows(running.app)).toBe(SPLASH_AND_MAIN_WINDOW);

  await quitAndClean(running);
});

test('keeps the starting text on the splash when automatic updates are disabled', async () => {
  const running = await launchWithLongSplash({ [SETTINGS_FILE_NAME]: JSON.stringify({ autoUpdate: false }) });
  const splash = await findSplashPage(running.app);

  await expect(splash.locator(SELECTORS.STATUS)).toHaveText(STARTING_TEXT);

  await quitAndClean(running);
});
