import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import electronBinary from 'electron';
import type { ElectronApplication } from '@playwright/test';
import type { RunningCalendar } from './support/runningCalendar';
import { closeCalendar, DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import { PROJECT_ROOT } from './support/coveragePaths';
import {
  buildUserDataEnvironment,
  createUserData,
  DEFAULT_USER_DATA_LAUNCH_OPTIONS,
  launchInUserData,
  quitAndWaitForExit,
  type MainProcessHookGlobals,
  type UserDataLaunchOptions
} from './support/userDataLaunch';
import { DATABASE_FILE_NAME, HIDDEN_LAUNCH_FLAG, REMINDER_CHECK_INTERVAL_MS, THEME_BACKGROUNDS } from '../../src/main/constants';

const ISO_DATE_LENGTH = 10;
const MILLISECONDS_PER_MINUTE = 60000;
const REMINDER_WAIT_MARGIN_MS = 15000;
const REMINDER_TEST_TIMEOUT_MS = REMINDER_CHECK_INTERVAL_MS * 3;
const START_OF_DAY = '00:00';
const FUTURE_DATE = '2999-12-31';
const FUTURE_TIME = '10:00';
const NO_REMINDER_DELAY = 0;
const SHORT_REMINDER_DELAY = 5;
const DUE_EVENT_ID = 'due-reminder';
const FUTURE_EVENT_ID = 'future-reminder';
const SILENT_EVENT_ID = 'no-reminder';
const LOAD_FAILURE_CODE = -3;
const LOAD_FAILURE_DESCRIPTION = 'aborted';
const LOAD_FAILURE_MESSAGE = 'renderer load failed';
const RENDERER_GONE_MESSAGE = 'renderer gone';
const CRASH_REASON = 'crashed';
const OPEN_MENU_INDEX = 0;
const QUIT_MENU_INDEX = 2;
const SINGLE_CLICK = 1;
const DOUBLE_CLICK = 2;
const ELECTRON_PATH = electronBinary as unknown as string;
const EXIT_EVENT = 'exit';
const WAL_FILE_SUFFIX = '-wal';

interface WindowState {
  visible: boolean;
  minimized: boolean;
  maximized: boolean;
  destroyed: boolean;
  backgroundColor: string;
}

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * MILLISECONDS_PER_MINUTE);
  return local.toISOString().slice(0, ISO_DATE_LENGTH);
}

function readWindowState(app: ElectronApplication): Promise<WindowState> {
  return app.evaluate(({ BrowserWindow }) => {
    const [window] = BrowserWindow.getAllWindows();
    return {
      visible: window.isVisible(),
      minimized: window.isMinimized(),
      maximized: window.isMaximized(),
      destroyed: window.isDestroyed(),
      backgroundColor: window.getBackgroundColor().toLowerCase()
    };
  });
}

async function expectWindowState(app: ElectronApplication, expected: Partial<WindowState>): Promise<void> {
  await expect.poll(() => readWindowState(app)).toMatchObject(expected);
}

function minimizeWindow(app: ElectronApplication): Promise<void> {
  return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
}

function runSecondInstance(userData: string): Promise<number | null> {
  const child = spawn(ELECTRON_PATH, [PROJECT_ROOT, HIDDEN_LAUNCH_FLAG], { env: buildUserDataEnvironment(userData) });
  return new Promise((resolve) => child.once(EXIT_EVENT, resolve));
}

function launchInFreshUserData(options: Partial<UserDataLaunchOptions> = {}): Promise<RunningCalendar> {
  return launchInUserData(createUserData({}), { ...DEFAULT_USER_DATA_LAUNCH_OPTIONS, ...options });
}

function clickTrayMenuItem(app: ElectronApplication, index: number, clicks = SINGLE_CLICK): Promise<void> {
  return app.evaluate((_electron, { itemIndex, clickCount }) => {
    const item = (globalThis as unknown as MainProcessHookGlobals).__e2eTrayMenu.items[itemIndex];
    for (let click = 0; click < clickCount; click++) item.click();
  }, { itemIndex: index, clickCount: clicks });
}

test.describe('visible start', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, visible: true } });

  test('reveals the window once the renderer finished loading', async ({ calendar: { app } }) => {
    await expectWindowState(app, { visible: true, minimized: false });
  });
});

test('keeps the window hidden when started with the hidden flag', async () => {
  const running = await launchInFreshUserData();
  await expectWindowState(running.app, { visible: false });
  await closeCalendar(running);
});

test('restores and reveals the window when a second instance starts', async ({ calendar: { app } }) => {
  await minimizeWindow(app);
  await expectWindowState(app, { minimized: true });
  await app.evaluate(({ app: electronApp }) => electronApp.emit('second-instance'));
  await expectWindowState(app, { minimized: false, visible: true });
});

test('reveals the hidden window when the app is activated', async ({ calendar: { app, page } }) => {
  await page.evaluate(() => window.calendarApi.hideWindow());
  await expectWindowState(app, { visible: false });
  await app.evaluate(({ app: electronApp }) => electronApp.emit('activate'));
  await expectWindowState(app, { visible: true });
});

test('minimizes and toggles maximize through the window bridge', async ({ calendar: { app, page } }) => {
  await page.evaluate(() => window.calendarApi.toggleMaximizeWindow());
  await expectWindowState(app, { maximized: true });
  await page.evaluate(() => window.calendarApi.toggleMaximizeWindow());
  await expectWindowState(app, { maximized: false });
  await page.evaluate(() => window.calendarApi.minimizeWindow());
  await expectWindowState(app, { minimized: true });
});

test('hides the window instead of closing it and keeps running without windows', async ({ calendar: { app } }) => {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await expectWindowState(app, { visible: false, destroyed: false });
  await app.evaluate(({ app: electronApp }) => electronApp.emit('window-all-closed'));
  await expectWindowState(app, { visible: false, destroyed: false });
});

test('logs renderer load failures and renderer crashes', async ({ calendar: { app } }) => {
  const messages: string[] = [];
  app.on('console', (message) => messages.push(message.text()));
  await app.evaluate(({ BrowserWindow }, failure) => {
    const { webContents } = BrowserWindow.getAllWindows()[0];
    webContents.emit('did-fail-load', {}, failure.code, failure.description);
    webContents.emit('render-process-gone', {}, { reason: failure.reason });
  }, { code: LOAD_FAILURE_CODE, description: LOAD_FAILURE_DESCRIPTION, reason: CRASH_REASON });
  await expect.poll(() => messages.join('\n')).toContain(LOAD_FAILURE_MESSAGE);
  await expect.poll(() => messages.join('\n')).toContain(RENDERER_GONE_MESSAGE);
});

test('follows the selected theme and native theme updates', async ({ calendar: { app, page } }) => {
  await page.evaluate(() => window.calendarApi.updateSettings({ theme: 'dark' }));
  await expectWindowState(app, { backgroundColor: THEME_BACKGROUNDS.dark });
  await page.evaluate(() => window.calendarApi.updateSettings({ theme: 'light' }));
  await expectWindowState(app, { backgroundColor: THEME_BACKGROUNDS.light });
  await app.evaluate(({ nativeTheme }) => {
    nativeTheme.themeSource = 'dark';
    nativeTheme.emit('updated');
  });
  await expectWindowState(app, { backgroundColor: THEME_BACKGROUNDS.dark });
});

test.describe('reminders on startup', () => {
  const today = todayIso();
  test.use({
    calendarLaunch: {
      ...DEFAULT_LAUNCH_OPTIONS,
      legacyEvents: [
        { id: DUE_EVENT_ID, date: today, time: START_OF_DAY, title: 'Fällige Erinnerung', reminderMinutes: NO_REMINDER_DELAY },
        { id: FUTURE_EVENT_ID, date: FUTURE_DATE, time: FUTURE_TIME, title: 'Spätere Erinnerung', reminderMinutes: SHORT_REMINDER_DELAY },
        { id: SILENT_EVENT_ID, date: today, time: START_OF_DAY, title: 'Ohne Erinnerung' }
      ]
    }
  });

  test('notifies only due reminders and marks them as notified', async ({ calendar: { page } }) => {
    const notifiedById = async () => {
      const events = await page.evaluate((range) => window.calendarApi.getEvents(range), { from: today, to: FUTURE_DATE });
      return Object.fromEntries(events.map((event) => [event.id, event.notified]));
    };
    await expect.poll(notifiedById).toEqual({ [DUE_EVENT_ID]: true, [FUTURE_EVENT_ID]: false, [SILENT_EVENT_ID]: false });
  });
});

test('notifies reminders that become due on the periodic check', async ({ calendar: { page } }) => {
  test.setTimeout(REMINDER_TEST_TIMEOUT_MS);
  const today = todayIso();
  const saved = await page.evaluate(
    (input) => window.calendarApi.saveEvent(input),
    { date: today, time: START_OF_DAY, title: 'Periodische Erinnerung', reminderMinutes: NO_REMINDER_DELAY }
  );
  const isNotified = async () => {
    const events = await page.evaluate((range) => window.calendarApi.getEvents(range), { from: today, to: today });
    return events.find((event) => event.id === saved.id)?.notified;
  };
  await expect.poll(isNotified, { timeout: REMINDER_CHECK_INTERVAL_MS + REMINDER_WAIT_MARGIN_MS }).toBe(true);
});

test('stores data in the default user data folder without an override', async () => {
  const running = await launchInFreshUserData({ userDataOverride: false });
  const { userData } = running;
  const userDataPath = await running.app.evaluate(({ app }) => app.getPath('userData'));
  expect(path.resolve(userDataPath)).toBe(path.resolve(userData));
  expect(existsSync(path.join(userData, DATABASE_FILE_NAME))).toBe(true);
  await closeCalendar(running);
});

test('exits a second instance and reveals the running one', async ({ calendar: { app, userData } }) => {
  await minimizeWindow(app);
  await expectWindowState(app, { minimized: true });
  await runSecondInstance(userData);
  await expectWindowState(app, { minimized: false, visible: true });
});

test('quits cleanly and closes the database', async ({ calendar: { app, userData } }) => {
  const databasePath = path.join(userData, DATABASE_FILE_NAME);
  await quitAndWaitForExit(app);
  expect(existsSync(databasePath)).toBe(true);
  expect(existsSync(databasePath + WAL_FILE_SUFFIX)).toBe(false);
});

test('ignores window events before the window exists and opens it from the tray', async () => {
  const running = await launchInFreshUserData({ mainProcessHooks: true });
  const { app } = running;
  await expectWindowState(app, { visible: false });
  await app.evaluate(() => (globalThis as unknown as MainProcessHookGlobals).__e2eTray.emit('click'));
  await expectWindowState(app, { visible: true });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
  await clickTrayMenuItem(app, OPEN_MENU_INDEX);
  await expectWindowState(app, { visible: true });
  await closeCalendar(running);
});

test('registers hidden autostart when running as a packaged app', async () => {
  const running = await launchInFreshUserData({ mainProcessHooks: true });
  const registered = await running.app.evaluate(() => (globalThis as unknown as MainProcessHookGlobals).__e2eLoginItemSettings);
  expect(registered).toEqual([{ openAtLogin: true, args: [HIDDEN_LAUNCH_FLAG] }]);
  await closeCalendar(running);
});

test('quits from the tray menu even when quit is triggered twice', async () => {
  const running = await launchInFreshUserData({ mainProcessHooks: true });
  const closed = running.app.waitForEvent('close');
  await clickTrayMenuItem(running.app, QUIT_MENU_INDEX, DOUBLE_CLICK).catch(() => undefined);
  await closed;
  await closeCalendar(running);
});
