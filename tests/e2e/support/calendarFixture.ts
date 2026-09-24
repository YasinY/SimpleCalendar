import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron, test as base, type ElectronApplication, type Page } from '@playwright/test';
import { MAIN_RAW_COVERAGE_DIR, PROJECT_ROOT, RENDERER_RAW_COVERAGE_DIR } from './coveragePaths';
import type { CalendarLaunchOptions } from './calendarLaunchOptions';
import type { RunningCalendar } from './runningCalendar';

export { expect } from '@playwright/test';

const USER_DATA_ENV_VARIABLE = 'SIMPLECALENDAR_USER_DATA';
const V8_COVERAGE_ENV_VARIABLE = 'NODE_V8_COVERAGE';
const USER_DATA_PREFIX = 'simplecalendar-e2e-';
const LEGACY_EVENTS_FILE_NAME = 'events.json';
const SETTINGS_FILE_NAME = 'settings.json';
const RENDERER_COVERAGE_EXTENSION = '.json';
const APP_ENTRY = PROJECT_ROOT;
const HIDDEN_LAUNCH_FLAG = '--hidden';
const KEEP_RENDERING_OFFSCREEN_FLAG = '--disable-features=CalculateNativeWinOcclusion';
const OFFSCREEN_POSITION = { x: -20000, y: -20000 };

export const DEFAULT_LAUNCH_OPTIONS: CalendarLaunchOptions = {
  args: [],
  legacyEvents: null,
  settings: null,
  visible: false
};

interface CalendarFixtures {
  calendarLaunch: CalendarLaunchOptions;
  calendar: RunningCalendar;
}

function seedUserData(userData: string, { legacyEvents, settings }: CalendarLaunchOptions): void {
  if (legacyEvents) writeFileSync(path.join(userData, LEGACY_EVENTS_FILE_NAME), JSON.stringify(legacyEvents));
  if (settings) writeFileSync(path.join(userData, SETTINGS_FILE_NAME), JSON.stringify(settings));
}

function buildEnvironment(userData: string): Record<string, string> {
  return {
    ...(process.env as Record<string, string>),
    [V8_COVERAGE_ENV_VARIABLE]: MAIN_RAW_COVERAGE_DIR,
    [USER_DATA_ENV_VARIABLE]: userData
  };
}

async function saveRendererCoverage(page: Page): Promise<void> {
  const entries = await page.coverage.stopJSCoverage().catch(() => []);
  if (entries.length === 0) return;
  mkdirSync(RENDERER_RAW_COVERAGE_DIR, { recursive: true });
  writeFileSync(path.join(RENDERER_RAW_COVERAGE_DIR, randomUUID() + RENDERER_COVERAGE_EXTENSION), JSON.stringify(entries));
}

function buildArguments({ args, visible }: CalendarLaunchOptions): string[] {
  if (visible) return [APP_ENTRY, ...args];
  return [APP_ENTRY, HIDDEN_LAUNCH_FLAG, KEEP_RENDERING_OFFSCREEN_FLAG, ...args];
}

async function showOffscreen(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ BrowserWindow }, position) => {
    const [window] = BrowserWindow.getAllWindows();
    window.setPosition(position.x, position.y);
    window.showInactive();
  }, OFFSCREEN_POSITION);
}

export async function launchCalendar(options: CalendarLaunchOptions): Promise<RunningCalendar> {
  const userData = mkdtempSync(path.join(tmpdir(), USER_DATA_PREFIX));
  seedUserData(userData, options);
  mkdirSync(MAIN_RAW_COVERAGE_DIR, { recursive: true });
  const app = await electron.launch({
    args: buildArguments(options),
    env: buildEnvironment(userData)
  });
  const page = await app.firstWindow();
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  await page.waitForLoadState('domcontentloaded');
  if (!options.visible) await showOffscreen(app);
  return { app, page, userData };
}

export async function closeCalendar({ app, page, userData }: RunningCalendar): Promise<void> {
  await saveRendererCoverage(page);
  await app.close().catch(() => undefined);
  rmSync(userData, { recursive: true, force: true });
}

export const test = base.extend<CalendarFixtures>({
  calendarLaunch: [DEFAULT_LAUNCH_OPTIONS, { option: true }],
  calendar: async ({ calendarLaunch }, use) => {
    const running = await launchCalendar(calendarLaunch);
    await use(running);
    await closeCalendar(running);
  }
});
