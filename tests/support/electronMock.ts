import { vi } from 'vitest';

export type Listener = (...args: unknown[]) => unknown;
export type ListenerMap = Map<string, Listener>;

function createRegistrar(listeners: ListenerMap) {
  return vi.fn((name: string, listener: Listener) => {
    listeners.set(name, listener);
  });
}

export const appListeners: ListenerMap = new Map();
export const ipcHandlers: ListenerMap = new Map();
export const ipcListeners: ListenerMap = new Map();
export const webContentsListeners: ListenerMap = new Map();
export const windowListeners: ListenerMap = new Map();
export const themeListeners: ListenerMap = new Map();

export class FakeBrowserWindow {
  static readonly instances: FakeBrowserWindow[] = [];
  readonly options: unknown;
  readonly webContents = {
    on: createRegistrar(webContentsListeners),
    once: createRegistrar(webContentsListeners),
    send: vi.fn()
  };
  readonly removeMenu = vi.fn();
  readonly loadFile = vi.fn(() => Promise.resolve());
  readonly on = createRegistrar(windowListeners);
  readonly once = createRegistrar(windowListeners);
  readonly isDestroyed = vi.fn(() => false);
  readonly close = vi.fn();
  readonly hide = vi.fn();
  readonly show = vi.fn();
  readonly focus = vi.fn();
  readonly isMinimized = vi.fn(() => false);
  readonly restore = vi.fn();
  readonly setBackgroundColor = vi.fn();
  readonly minimize = vi.fn();
  readonly isMaximized = vi.fn(() => false);
  readonly maximize = vi.fn();
  readonly unmaximize = vi.fn();

  constructor(options: unknown) {
    this.options = options;
    FakeBrowserWindow.instances.push(this);
  }
}

export class FakeNotification {
  static readonly instances: FakeNotification[] = [];
  readonly options: unknown;
  readonly show = vi.fn();

  constructor(options: unknown) {
    this.options = options;
    FakeNotification.instances.push(this);
  }
}

let resolveReady: () => void = () => {};

export const FAKE_APP_VERSION = '9.9.9';

export const fakeApp = {
  isPackaged: false,
  getVersion: vi.fn(() => FAKE_APP_VERSION),
  requestSingleInstanceLock: vi.fn(() => true),
  quit: vi.fn(),
  on: createRegistrar(appListeners),
  whenReady: vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveReady = resolve;
      })
  ),
  setAppUserModelId: vi.fn(),
  setLoginItemSettings: vi.fn(),
  getPath: vi.fn((_name: string) => ''),
  getLoginItemSettings: vi.fn(() => ({ wasOpenedAtLogin: false }))
};

export const fakeIpcMain = {
  handle: createRegistrar(ipcHandlers),
  on: createRegistrar(ipcListeners)
};

export const fakeNativeTheme = {
  shouldUseDarkColors: false,
  themeSource: '',
  on: createRegistrar(themeListeners)
};

export const electronMock = {
  app: fakeApp,
  BrowserWindow: FakeBrowserWindow,
  ipcMain: fakeIpcMain,
  nativeTheme: fakeNativeTheme,
  Notification: FakeNotification
};

export function resolveAppReady(): void {
  resolveReady();
}

export function invokeListener(listeners: ListenerMap, name: string, ...args: unknown[]): unknown {
  return (listeners.get(name) as Listener)(...args);
}

export function resetElectronMock(): void {
  [appListeners, ipcHandlers, ipcListeners, webContentsListeners, windowListeners, themeListeners].forEach((listeners) =>
    listeners.clear()
  );
  FakeBrowserWindow.instances.length = 0;
  FakeNotification.instances.length = 0;
  fakeApp.isPackaged = false;
  fakeApp.requestSingleInstanceLock.mockReturnValue(true);
  fakeApp.getLoginItemSettings.mockReturnValue({ wasOpenedAtLogin: false });
  fakeNativeTheme.shouldUseDarkColors = false;
  fakeNativeTheme.themeSource = '';
}
