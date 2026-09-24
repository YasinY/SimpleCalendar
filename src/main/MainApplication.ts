import { app, BrowserWindow, ipcMain, nativeTheme, Notification } from 'electron';
import {
  APP_LOCALE,
  APP_USER_MODEL_ID,
  HIDDEN_LAUNCH_FLAG,
  NOTIFICATION_BODY_SEPARATOR,
  NOTIFICATION_BODY_SUFFIX,
  NOTIFICATION_DATE_FORMAT,
  PRELOAD_PATH,
  RENDERER_ENTRY_PATH,
  THEME_BACKGROUNDS,
  WINDOW_OPTIONS
} from './constants';
import { ReminderScheduler } from './reminders/ReminderScheduler';
import { openStorage } from './storage/openStorage';
import { IPC_CHANNELS } from '../shared/ipcChannels';
import type { CalendarStorage } from './storage/calendarStorage';
import type { TrayManager } from './tray/TrayManager';
import type { CalendarEvent } from '../shared/calendarEvent';
import type { DateRange } from '../shared/dateRange';
import type { EventInput } from '../shared/eventInput';
import type { Settings } from '../shared/settings';
import type { Theme } from '../shared/theme';

const WINDOW_CONTROL_ACTIONS: Record<string, (window: BrowserWindow) => void> = {
  [IPC_CHANNELS.WINDOW_MINIMIZE]: (window) => window.minimize(),
  [IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE]: (window) => (window.isMaximized() ? window.unmaximize() : window.maximize()),
  [IPC_CHANNELS.WINDOW_HIDE]: (window) => window.hide()
};

export class MainApplication {
  readonly #trayManager: TrayManager;
  readonly #dateFormatter = new Intl.DateTimeFormat(APP_LOCALE, NOTIFICATION_DATE_FORMAT);
  #storage: CalendarStorage | null = null;
  #scheduler: ReminderScheduler | null = null;
  #mainWindow: BrowserWindow | null = null;
  #isQuitting = false;

  constructor(trayManager: TrayManager) {
    this.#trayManager = trayManager;
  }

  run(): void {
    if (!app.requestSingleInstanceLock()) {
      app.quit();
      return;
    }
    app.on('second-instance', () => this.#revealWindow());
    app.on('before-quit', () => this.#markQuitting());
    app.on('will-quit', () => this.#closeStorage());
    app.on('window-all-closed', () => {});
    app.on('activate', () => this.#revealWindow());
    void app.whenReady().then(() => this.#bootstrap());
  }

  #bootstrap(): void {
    app.setAppUserModelId(APP_USER_MODEL_ID);
    this.#registerAutostart();

    const storage = openStorage(app.getPath('userData'));
    this.#storage = storage;
    this.#scheduler = new ReminderScheduler(storage.events, (event, eventDate) => this.#showNotification(event, eventDate));

    this.#applyTheme(storage.settings.getAll().theme);
    nativeTheme.on('updated', () => this.#mainWindow?.setBackgroundColor(this.#currentBackgroundColor()));

    this.#registerIpcHandlers(storage);
    this.#trayManager.create({ onOpen: () => this.#revealWindow(), onQuit: () => this.#quit() });

    this.#mainWindow = this.#createWindow();
    if (!this.#startsHidden()) this.#mainWindow.webContents.once('did-finish-load', () => this.#revealWindow());

    this.#scheduler.start();
  }

  #startsHidden(): boolean {
    if (process.argv.includes(HIDDEN_LAUNCH_FLAG)) return true;
    return app.getLoginItemSettings().wasOpenedAtLogin;
  }

  #showNotification(event: CalendarEvent, eventDate: Date): void {
    const body = this.#dateFormatter.format(eventDate) + NOTIFICATION_BODY_SEPARATOR + event.time + NOTIFICATION_BODY_SUFFIX;
    new Notification({ title: event.title, body }).show();
  }

  #currentBackgroundColor(): string {
    return nativeTheme.shouldUseDarkColors ? THEME_BACKGROUNDS.dark : THEME_BACKGROUNDS.light;
  }

  #applyTheme(theme: Theme): void {
    nativeTheme.themeSource = theme;
    this.#mainWindow?.setBackgroundColor(this.#currentBackgroundColor());
  }

  #createWindow(): BrowserWindow {
    const window = new BrowserWindow({
      ...WINDOW_OPTIONS,
      backgroundColor: this.#currentBackgroundColor(),
      webPreferences: {
        preload: PRELOAD_PATH,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    window.removeMenu();
    const webContents = window.webContents;
    webContents.on('did-fail-load', (_event, code, description) => console.error('renderer load failed', code, description));
    webContents.on('render-process-gone', (_event, details) => console.error('renderer gone', details));
    void window.loadFile(RENDERER_ENTRY_PATH);
    window.on('close', (nativeEvent) => {
      if (this.#isQuitting) return;
      nativeEvent.preventDefault();
      window.hide();
    });
    return window;
  }

  #revealWindow(): void {
    const window = this.#mainWindow;
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  }

  #markQuitting(): void {
    this.#isQuitting = true;
  }

  #closeStorage(): void {
    this.#storage?.database.$client.close();
  }

  #quit(): void {
    this.#markQuitting();
    this.#scheduler?.stop();
    this.#trayManager.destroy();
    app.quit();
  }

  #registerAutostart(): void {
    if (!app.isPackaged) return;
    app.setLoginItemSettings({
      openAtLogin: true,
      args: [HIDDEN_LAUNCH_FLAG]
    });
  }

  #registerWindowControlHandlers(): void {
    for (const [channel, action] of Object.entries(WINDOW_CONTROL_ACTIONS)) {
      ipcMain.on(channel, () => {
        const window = this.#mainWindow;
        if (!window) return;
        action(window);
      });
    }
  }

  #registerIpcHandlers({ events, settings }: CalendarStorage): void {
    ipcMain.handle(IPC_CHANNELS.GET_EVENTS, (_event, range: DateRange) => events.getBetween(range));
    ipcMain.handle(IPC_CHANNELS.SAVE_EVENT, (_event, payload: EventInput) => events.save(payload));
    ipcMain.handle(IPC_CHANNELS.DELETE_EVENT, (_event, id: string) => events.delete(id));
    ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => settings.getAll());
    ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_event, patch: Partial<Settings>) => {
      const updated = settings.update(patch);
      this.#applyTheme(updated.theme);
      return updated;
    });
    this.#registerWindowControlHandlers();
  }
}
