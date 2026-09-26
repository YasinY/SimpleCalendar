import { expect, type ElectronApplication, type Page } from '@playwright/test';

export const SPLASH_MINIMUM_ENV_VARIABLE = 'SIMPLECALENDAR_SPLASH_MINIMUM_MS';
export const NO_SPLASH_DELAY_MS = 0;

const SPLASH_PAGE_FILE = 'splash.html';
const SINGLE_WINDOW = 1;
const SPLASH_NOT_FOUND = 'splash window not found';

function splashPage(app: ElectronApplication): Page | undefined {
  return app.windows().find((page) => page.url().endsWith(SPLASH_PAGE_FILE));
}

export function countWindows(app: ElectronApplication): Promise<number> {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
}

export async function waitForSplashClosed(app: ElectronApplication): Promise<void> {
  await expect.poll(() => countWindows(app)).toBe(SINGLE_WINDOW);
}

export async function acquireMainPage(app: ElectronApplication): Promise<Page> {
  const splash = await app.firstWindow();
  const existing = app.windows().find((page) => page !== splash);
  if (existing) return existing;
  return app.waitForEvent('window');
}

export async function findSplashPage(app: ElectronApplication): Promise<Page> {
  await expect.poll(() => splashPage(app) !== undefined).toBe(true);
  const page = splashPage(app);
  if (!page) throw new Error(SPLASH_NOT_FOUND);
  return page;
}
