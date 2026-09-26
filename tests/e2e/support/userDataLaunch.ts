import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import type { Menu, Settings as LoginItemSettings, Tray } from 'electron';
import { MAIN_RAW_COVERAGE_DIR, PROJECT_ROOT } from './coveragePaths';
import { acquireMainPage, NO_SPLASH_DELAY_MS, SPLASH_MINIMUM_ENV_VARIABLE, waitForSplashClosed } from './splashWindow';
import type { RunningCalendar } from './runningCalendar';

const USER_DATA_ENV_VARIABLE = 'SIMPLECALENDAR_USER_DATA';
const V8_COVERAGE_ENV_VARIABLE = 'NODE_V8_COVERAGE';
const REQUIRE_FLAG = '-r';
const USER_DATA_PREFIX = 'simplecalendar-e2e-storage-';
const HIDDEN_LAUNCH_FLAG = '--hidden';
const USER_DATA_DIR_SWITCH = '--user-data-dir=';
const MAIN_PROCESS_HOOKS_PATH = path.join(__dirname, 'mainProcessHooks.cjs').replace(/\\/g, '/');
const OFFSCREEN_WINDOWS_HOOK_PATH = path.join(__dirname, 'offscreenWindows.cjs').replace(/\\/g, '/');

export interface UserDataLaunchOptions {
  mainProcessHooks: boolean;
  userDataOverride: boolean;
  splashMinimumMs: number;
}

export interface MainProcessHookGlobals {
  __e2eTray: Tray;
  __e2eTrayMenu: Menu;
  __e2eLoginItemSettings: LoginItemSettings[];
  __e2eConsoleMessages: string[];
}

export const DEFAULT_USER_DATA_LAUNCH_OPTIONS: UserDataLaunchOptions = {
  mainProcessHooks: false,
  userDataOverride: true,
  splashMinimumMs: NO_SPLASH_DELAY_MS
};

export function createUserData(files: Record<string, string>): string {
  const userData = mkdtempSync(path.join(tmpdir(), USER_DATA_PREFIX));
  for (const [fileName, content] of Object.entries(files)) writeFileSync(path.join(userData, fileName), content);
  return userData;
}

export function removeUserData(userData: string): void {
  rmSync(userData, { recursive: true, force: true });
}

export function buildUserDataEnvironment(userData: string, splashMinimumMs = NO_SPLASH_DELAY_MS): Record<string, string> {
  return {
    ...(process.env as Record<string, string>),
    [V8_COVERAGE_ENV_VARIABLE]: MAIN_RAW_COVERAGE_DIR,
    [USER_DATA_ENV_VARIABLE]: userData,
    [SPLASH_MINIMUM_ENV_VARIABLE]: String(splashMinimumMs)
  };
}

function withoutUserDataOverride(environment: Record<string, string>): Record<string, string> {
  const { [USER_DATA_ENV_VARIABLE]: _override, ...rest } = environment;
  return rest;
}

function buildEnvironment(userData: string, { userDataOverride, splashMinimumMs }: UserDataLaunchOptions): Record<string, string> {
  const environment = buildUserDataEnvironment(userData, splashMinimumMs);
  return userDataOverride ? environment : withoutUserDataOverride(environment);
}

function buildArguments(userData: string, { mainProcessHooks, userDataOverride }: UserDataLaunchOptions): string[] {
  const hookArguments = mainProcessHooks ? [REQUIRE_FLAG, MAIN_PROCESS_HOOKS_PATH] : [];
  const userDataArguments = userDataOverride ? [] : [USER_DATA_DIR_SWITCH + userData];
  return [REQUIRE_FLAG, OFFSCREEN_WINDOWS_HOOK_PATH, ...hookArguments, PROJECT_ROOT, HIDDEN_LAUNCH_FLAG, ...userDataArguments];
}

export async function launchElectronInUserData(
  userData: string,
  options: UserDataLaunchOptions = DEFAULT_USER_DATA_LAUNCH_OPTIONS
): Promise<ElectronApplication> {
  mkdirSync(MAIN_RAW_COVERAGE_DIR, { recursive: true });
  return electron.launch({
    args: buildArguments(userData, options),
    env: buildEnvironment(userData, options)
  });
}

export async function launchInUserData(
  userData: string,
  options: UserDataLaunchOptions = DEFAULT_USER_DATA_LAUNCH_OPTIONS
): Promise<RunningCalendar> {
  const app = await launchElectronInUserData(userData, options);
  const page: Page = await acquireMainPage(app);
  await page.waitForLoadState('domcontentloaded');
  await waitForSplashClosed(app);
  return { app, page, userData };
}

export async function quitAndWaitForExit(app: ElectronApplication): Promise<void> {
  const closed = app.waitForEvent('close');
  await app.evaluate(({ app: electronApp }) => electronApp.quit()).catch(() => undefined);
  await closed;
}
