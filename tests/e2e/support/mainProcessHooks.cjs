const BROWSER_PROCESS_TYPE = 'browser';
const ELECTRON_MODULE = 'electron';
const WINDOW_MINIMIZE_CHANNEL = 'window:minimize';
const ACTIVATE_EVENT = 'activate';
const THEME_UPDATED_EVENT = 'updated';
const IS_PACKAGED_PROPERTY = 'isPackaged';
const RECORDED_CONSOLE_METHODS = ['info', 'error'];
const MESSAGE_PART_SEPARATOR = ' ';

function recordConsoleMessages() {
  globalThis.__e2eConsoleMessages = [];
  for (const methodName of RECORDED_CONSOLE_METHODS) {
    const original = console[methodName];
    console[methodName] = (...parts) => {
      globalThis.__e2eConsoleMessages.push(parts.map(String).join(MESSAGE_PART_SEPARATOR));
      original.apply(console, parts);
    };
  }
}

function simulatePackagedAppWithRecordedAutostart(app) {
  globalThis.__e2eLoginItemSettings = [];
  Object.defineProperty(app, IS_PACKAGED_PROPERTY, { get: () => true, configurable: true });
  app.setLoginItemSettings = (settings) => globalThis.__e2eLoginItemSettings.push(settings);
}

function exposeTrayAndEmitEventsBeforeWindowExists({ app, ipcMain, nativeTheme, Tray }) {
  const originalSetContextMenu = Tray.prototype.setContextMenu;
  Tray.prototype.setContextMenu = function setContextMenu(menu) {
    globalThis.__e2eTray = this;
    globalThis.__e2eTrayMenu = menu;
    app.emit(ACTIVATE_EVENT);
    ipcMain.emit(WINDOW_MINIMIZE_CHANNEL, {});
    nativeTheme.emit(THEME_UPDATED_EVENT);
    return originalSetContextMenu.call(this, menu);
  };
}

function installHooks() {
  const electron = require(ELECTRON_MODULE);
  simulatePackagedAppWithRecordedAutostart(electron.app);
  exposeTrayAndEmitEventsBeforeWindowExists(electron);
}

if (process.type === BROWSER_PROCESS_TYPE) {
  recordConsoleMessages();
  setImmediate(installHooks);
}
