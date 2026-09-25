import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_USER_MODEL_ID, HIDDEN_LAUNCH_FLAG, RENDERER_ENTRY_PATH, THEME_BACKGROUNDS } from '@main/constants';
import { MainApplication } from '@main/MainApplication';
import { openStorage } from '@main/storage/openStorage';
import { IPC_CHANNELS } from '@shared/ipcChannels';
import { DEFAULT_SETTINGS } from '@shared/settingsDefaults';
import type { CalendarStorage } from '@main/storage/calendarStorage';
import type { TrayManager } from '@main/tray/TrayManager';
import type { UpdateService } from '@main/updates/UpdateService';
import type { Settings } from '@shared/settings';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import {
  FakeBrowserWindow,
  FakeNotification,
  appListeners,
  fakeApp,
  fakeNativeTheme,
  invokeListener,
  ipcHandlers,
  ipcListeners,
  resetElectronMock,
  resolveAppReady,
  themeListeners,
  webContentsListeners,
  windowListeners
} from '@tests/support/electronMock';

vi.mock('electron', async () => (await import('@tests/support/electronMock')).electronMock);
vi.mock('@main/storage/openStorage', () => ({ openStorage: vi.fn() }));

const USER_DATA_PATH = 'C:/user-data';
const USER_DATA_PATH_NAME = 'userData';
const SECOND_INSTANCE = 'second-instance';
const BEFORE_QUIT = 'before-quit';
const WILL_QUIT = 'will-quit';
const WINDOW_ALL_CLOSED = 'window-all-closed';
const ACTIVATE = 'activate';
const APP_EVENTS = [SECOND_INSTANCE, BEFORE_QUIT, WILL_QUIT, WINDOW_ALL_CLOSED, ACTIVATE];
const NO_TIMERS = 0;
const NO_WINDOWS = 0;
const SINGLE_NOTIFICATION = 1;
const DID_FINISH_LOAD = 'did-finish-load';
const DID_FAIL_LOAD = 'did-fail-load';
const RENDER_PROCESS_GONE = 'render-process-gone';
const CLOSE_EVENT = 'close';
const THEME_UPDATED = 'updated';
const LOAD_ERROR_CODE = -3;
const LOAD_ERROR_DESCRIPTION = 'ERR_ABORTED';
const GONE_DETAILS = { reason: 'crashed' };
const DATE_RANGE = { start: '2026-09-01', end: '2026-09-30' };
const EVENT_ID = 'event-42';
const EVENT_INPUT = { title: 'Meeting' };
const TODAY = '2026-09-16';
const OCCURRENCE_INPUT = { id: EVENT_ID, occurrenceDate: TODAY, title: 'Ausnahme' };
const OCCURRENCE_REF = { id: EVENT_ID, occurrenceDate: TODAY };
const NOW = new Date(2026, 8, 16, 9, 0, 0, 0);
const DARK_THEME_PATCH: Partial<Settings> = { theme: 'dark' };
const DUE_EVENT = createCalendarEvent({ date: TODAY, time: '09:00', reminderMinutes: 0, notified: false });
const DUE_EVENT_BODY = '16.09.2026 um 09:00 Uhr';
const FIRST_INDEX = 0;

type StorageStub = ReturnType<typeof createStorageStub>;

function createStorageStub() {
  return {
    database: { $client: { close: vi.fn() } },
    events: {
      getBetween: vi.fn(() => []),
      save: vi.fn((input: unknown) => input),
      saveOccurrence: vi.fn((input: unknown) => input),
      delete: vi.fn(),
      deleteOccurrence: vi.fn(() => true),
      getPendingReminders: vi.fn((_referenceDate: string) => [DUE_EVENT]),
      markNotified: vi.fn()
    },
    settings: {
      getAll: vi.fn((): Settings => DEFAULT_SETTINGS),
      update: vi.fn((patch: Partial<Settings>) => ({ ...DEFAULT_SETTINGS, ...patch }))
    }
  };
}

function createTrayStub() {
  const handlers = { onOpen: () => {}, onQuit: () => {} };
  return {
    handlers,
    create: vi.fn((created: typeof handlers) => Object.assign(handlers, created)),
    destroy: vi.fn()
  };
}

function createUpdateServiceStub() {
  return { start: vi.fn() };
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function mainWindow(): FakeBrowserWindow {
  return FakeBrowserWindow.instances[FIRST_INDEX];
}

const originalArgv = process.argv;
let storage: StorageStub;
let tray: ReturnType<typeof createTrayStub>;
let updateService: ReturnType<typeof createUpdateServiceStub>;
let application: MainApplication;

async function startApplication(): Promise<void> {
  application.run();
  resolveAppReady();
  await flushPromises();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
  resetElectronMock();
  fakeApp.getPath.mockReturnValue(USER_DATA_PATH);
  storage = createStorageStub();
  vi.mocked(openStorage).mockReturnValue(storage as unknown as CalendarStorage);
  tray = createTrayStub();
  updateService = createUpdateServiceStub();
  application = new MainApplication(tray as unknown as TrayManager, updateService as unknown as UpdateService);
});

afterEach(() => {
  process.argv = originalArgv;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('MainApplication', () => {
  describe('single instance lock', () => {
    it('quits without registering listeners when the lock is not acquired', () => {
      fakeApp.requestSingleInstanceLock.mockReturnValue(false);

      application.run();

      expect(fakeApp.quit).toHaveBeenCalledTimes(1);
      expect(fakeApp.on).not.toHaveBeenCalled();
      expect(fakeApp.whenReady).not.toHaveBeenCalled();
    });

    it('registers all app listeners when the lock is acquired', () => {
      application.run();

      expect([...appListeners.keys()]).toEqual(APP_EVENTS);
      expect(fakeApp.quit).not.toHaveBeenCalled();
    });

    it('ignores the window-all-closed event', () => {
      application.run();

      expect(invokeListener(appListeners, WINDOW_ALL_CLOSED)).toBeUndefined();
      expect(fakeApp.quit).not.toHaveBeenCalled();
    });
  });

  describe('before bootstrap', () => {
    it('ignores window reveal requests without a window', () => {
      application.run();

      expect(() => invokeListener(appListeners, SECOND_INSTANCE)).not.toThrow();
      expect(() => invokeListener(appListeners, ACTIVATE)).not.toThrow();
      expect(FakeBrowserWindow.instances).toHaveLength(NO_WINDOWS);
    });

    it('does not close the database when quitting before storage is opened', () => {
      application.run();

      expect(() => invokeListener(appListeners, WILL_QUIT)).not.toThrow();
      expect(openStorage).not.toHaveBeenCalled();
    });
  });

  describe('bootstrap', () => {
    it('sets the app user model id and opens the storage in the user data path', async () => {
      await startApplication();

      expect(fakeApp.setAppUserModelId).toHaveBeenCalledWith(APP_USER_MODEL_ID);
      expect(fakeApp.getPath).toHaveBeenCalledWith(USER_DATA_PATH_NAME);
      expect(openStorage).toHaveBeenCalledWith(USER_DATA_PATH);
    });

    it('does not register autostart when the app is not packaged', async () => {
      await startApplication();

      expect(fakeApp.setLoginItemSettings).not.toHaveBeenCalled();
    });

    it('registers a hidden autostart when the app is packaged', async () => {
      fakeApp.isPackaged = true;

      await startApplication();

      expect(fakeApp.setLoginItemSettings).toHaveBeenCalledWith({ openAtLogin: true, args: [HIDDEN_LAUNCH_FLAG] });
    });

    it('applies the stored theme and creates the window with the light background', async () => {
      await startApplication();

      expect(fakeNativeTheme.themeSource).toBe(DEFAULT_SETTINGS.theme);
      expect(mainWindow().options).toMatchObject({ backgroundColor: THEME_BACKGROUNDS.light });
      expect(mainWindow().removeMenu).toHaveBeenCalledTimes(1);
      expect(mainWindow().loadFile).toHaveBeenCalledWith(RENDERER_ENTRY_PATH);
    });

    it('creates the window with the dark background when dark colors are used', async () => {
      fakeNativeTheme.shouldUseDarkColors = true;

      await startApplication();

      expect(mainWindow().options).toMatchObject({ backgroundColor: THEME_BACKGROUNDS.dark });
    });

    it('updates the window background when the native theme changes', async () => {
      await startApplication();
      fakeNativeTheme.shouldUseDarkColors = true;

      invokeListener(themeListeners, THEME_UPDATED);

      expect(mainWindow().setBackgroundColor).toHaveBeenCalledWith(THEME_BACKGROUNDS.dark);
    });

    it('ignores native theme changes before the window exists', async () => {
      tray.create.mockImplementation(() => {
        invokeListener(themeListeners, THEME_UPDATED);
        return tray.handlers;
      });

      await startApplication();

      expect(mainWindow().setBackgroundColor).not.toHaveBeenCalled();
    });

    it('starts the update service when automatic updates are enabled', async () => {
      await startApplication();

      expect(storage.settings.getAll).toHaveBeenCalledTimes(1);
      expect(updateService.start).toHaveBeenCalledTimes(1);
    });

    it('does not start the update service when automatic updates are disabled', async () => {
      storage.settings.getAll.mockReturnValue({ ...DEFAULT_SETTINGS, autoUpdate: false });

      await startApplication();

      expect(updateService.start).not.toHaveBeenCalled();
    });
  });

  describe('ipc handlers', () => {
    beforeEach(startApplication);

    it('returns the events of a date range', () => {
      invokeListener(ipcHandlers, IPC_CHANNELS.GET_EVENTS, {}, DATE_RANGE);

      expect(storage.events.getBetween).toHaveBeenCalledWith(DATE_RANGE);
    });

    it('saves an event', () => {
      const saved = invokeListener(ipcHandlers, IPC_CHANNELS.SAVE_EVENT, {}, EVENT_INPUT);

      expect(storage.events.save).toHaveBeenCalledWith(EVENT_INPUT);
      expect(saved).toBe(EVENT_INPUT);
    });

    it('saves a single occurrence', () => {
      const saved = invokeListener(ipcHandlers, IPC_CHANNELS.SAVE_OCCURRENCE, {}, OCCURRENCE_INPUT);

      expect(storage.events.saveOccurrence).toHaveBeenCalledWith(OCCURRENCE_INPUT);
      expect(saved).toBe(OCCURRENCE_INPUT);
    });

    it('deletes an event', () => {
      invokeListener(ipcHandlers, IPC_CHANNELS.DELETE_EVENT, {}, EVENT_ID);

      expect(storage.events.delete).toHaveBeenCalledWith(EVENT_ID);
    });

    it('deletes a single occurrence', () => {
      const deleted = invokeListener(ipcHandlers, IPC_CHANNELS.DELETE_OCCURRENCE, {}, OCCURRENCE_REF);

      expect(storage.events.deleteOccurrence).toHaveBeenCalledWith(OCCURRENCE_REF);
      expect(deleted).toBe(true);
    });

    it('returns the settings', () => {
      expect(invokeListener(ipcHandlers, IPC_CHANNELS.GET_SETTINGS)).toBe(DEFAULT_SETTINGS);
    });

    it('updates the settings and applies the new theme', () => {
      fakeNativeTheme.shouldUseDarkColors = true;

      const updated = invokeListener(ipcHandlers, IPC_CHANNELS.UPDATE_SETTINGS, {}, DARK_THEME_PATCH);

      expect(storage.settings.update).toHaveBeenCalledWith(DARK_THEME_PATCH);
      expect(updated).toEqual({ ...DEFAULT_SETTINGS, ...DARK_THEME_PATCH });
      expect(fakeNativeTheme.themeSource).toBe(DARK_THEME_PATCH.theme);
      expect(mainWindow().setBackgroundColor).toHaveBeenCalledWith(THEME_BACKGROUNDS.dark);
    });
  });

  describe('window controls', () => {
    it('ignores window control requests without a window', async () => {
      tray.create.mockImplementation(() => {
        Object.values(IPC_CHANNELS).forEach((channel) => ipcListeners.get(channel)?.());
        return tray.handlers;
      });

      await startApplication();

      expect(mainWindow().minimize).not.toHaveBeenCalled();
      expect(mainWindow().maximize).not.toHaveBeenCalled();
      expect(mainWindow().hide).not.toHaveBeenCalled();
    });

    it('minimizes the window', async () => {
      await startApplication();

      invokeListener(ipcListeners, IPC_CHANNELS.WINDOW_MINIMIZE);

      expect(mainWindow().minimize).toHaveBeenCalledTimes(1);
    });

    it('maximizes the window when it is not maximized', async () => {
      await startApplication();

      invokeListener(ipcListeners, IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE);

      expect(mainWindow().maximize).toHaveBeenCalledTimes(1);
      expect(mainWindow().unmaximize).not.toHaveBeenCalled();
    });

    it('unmaximizes the window when it is maximized', async () => {
      await startApplication();
      mainWindow().isMaximized.mockReturnValue(true);

      invokeListener(ipcListeners, IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE);

      expect(mainWindow().unmaximize).toHaveBeenCalledTimes(1);
      expect(mainWindow().maximize).not.toHaveBeenCalled();
    });

    it('hides the window', async () => {
      await startApplication();

      invokeListener(ipcListeners, IPC_CHANNELS.WINDOW_HIDE);

      expect(mainWindow().hide).toHaveBeenCalledTimes(1);
    });
  });

  describe('window visibility', () => {
    it('shows and focuses the window after the renderer finished loading', async () => {
      await startApplication();

      invokeListener(webContentsListeners, DID_FINISH_LOAD);

      expect(mainWindow().show).toHaveBeenCalledTimes(1);
      expect(mainWindow().focus).toHaveBeenCalledTimes(1);
      expect(mainWindow().restore).not.toHaveBeenCalled();
    });

    it('starts hidden when launched with the hidden flag', async () => {
      process.argv = [...originalArgv, HIDDEN_LAUNCH_FLAG];

      await startApplication();

      expect(webContentsListeners.has(DID_FINISH_LOAD)).toBe(false);
      expect(fakeApp.getLoginItemSettings).not.toHaveBeenCalled();
    });

    it('starts hidden when opened at login', async () => {
      fakeApp.getLoginItemSettings.mockReturnValue({ wasOpenedAtLogin: true });

      await startApplication();

      expect(webContentsListeners.has(DID_FINISH_LOAD)).toBe(false);
    });

    it('restores a minimized window when revealed from the tray', async () => {
      await startApplication();
      mainWindow().isMinimized.mockReturnValue(true);

      tray.handlers.onOpen();

      expect(mainWindow().restore).toHaveBeenCalledTimes(1);
      expect(mainWindow().show).toHaveBeenCalledTimes(1);
      expect(mainWindow().focus).toHaveBeenCalledTimes(1);
    });

    it.each([SECOND_INSTANCE, ACTIVATE])('reveals the window on %s', async (eventName) => {
      await startApplication();

      invokeListener(appListeners, eventName);

      expect(mainWindow().show).toHaveBeenCalledTimes(1);
      expect(mainWindow().focus).toHaveBeenCalledTimes(1);
    });

    it('hides the window instead of closing it while not quitting', async () => {
      await startApplication();
      const nativeEvent = { preventDefault: vi.fn() };

      invokeListener(windowListeners, CLOSE_EVENT, nativeEvent);

      expect(nativeEvent.preventDefault).toHaveBeenCalledTimes(1);
      expect(mainWindow().hide).toHaveBeenCalledTimes(1);
    });

    it('lets the window close while quitting', async () => {
      await startApplication();
      const nativeEvent = { preventDefault: vi.fn() };
      invokeListener(appListeners, BEFORE_QUIT);

      invokeListener(windowListeners, CLOSE_EVENT, nativeEvent);

      expect(nativeEvent.preventDefault).not.toHaveBeenCalled();
      expect(mainWindow().hide).not.toHaveBeenCalled();
    });
  });

  describe('renderer errors', () => {
    beforeEach(startApplication);

    it('logs failed renderer loads', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      invokeListener(webContentsListeners, DID_FAIL_LOAD, {}, LOAD_ERROR_CODE, LOAD_ERROR_DESCRIPTION);

      expect(consoleError).toHaveBeenCalledWith(expect.any(String), LOAD_ERROR_CODE, LOAD_ERROR_DESCRIPTION);
    });

    it('logs a gone render process', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      invokeListener(webContentsListeners, RENDER_PROCESS_GONE, {}, GONE_DETAILS);

      expect(consoleError).toHaveBeenCalledWith(expect.any(String), GONE_DETAILS);
    });
  });

  describe('quitting', () => {
    it('stops the scheduler, destroys the tray and quits from the tray', async () => {
      await startApplication();
      const nativeEvent = { preventDefault: vi.fn() };

      tray.handlers.onQuit();
      invokeListener(windowListeners, CLOSE_EVENT, nativeEvent);

      expect(vi.getTimerCount()).toBe(NO_TIMERS);
      expect(tray.destroy).toHaveBeenCalledTimes(1);
      expect(fakeApp.quit).toHaveBeenCalledTimes(1);
      expect(nativeEvent.preventDefault).not.toHaveBeenCalled();
    });

    it('closes the database on will-quit', async () => {
      await startApplication();

      invokeListener(appListeners, WILL_QUIT);

      expect(storage.database.$client.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('reminders', () => {
    it('shows a notification for a due event and marks it as notified', async () => {
      await startApplication();
      const notification = FakeNotification.instances[FIRST_INDEX];

      expect(FakeNotification.instances).toHaveLength(SINGLE_NOTIFICATION);
      expect(notification.options).toEqual({ title: DUE_EVENT.title, body: DUE_EVENT_BODY });
      expect(notification.show).toHaveBeenCalledTimes(1);
      expect(storage.events.getPendingReminders).toHaveBeenCalledWith(TODAY);
      expect(storage.events.markNotified).toHaveBeenCalledWith(DUE_EVENT.id, DUE_EVENT.date);
    });
  });
});
