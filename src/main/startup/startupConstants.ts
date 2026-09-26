import path from 'node:path';
import type { BrowserWindowConstructorOptions } from 'electron';

export const SPLASH_MINIMUM_DURATION_MS = 1800;
export const SPLASH_MINIMUM_DURATION_ENV_VARIABLE = 'SIMPLECALENDAR_SPLASH_MINIMUM_MS';
export const UPDATE_CHECK_TIMEOUT_MS = 10000;
export const INSTALL_DELAY_MS = 1200;

export const SPLASH_ENTRY_PATH = path.join(__dirname, '..', 'renderer', 'splash.html');
export const SPLASH_PRELOAD_PATH = path.join(__dirname, 'splashPreload.js');

export const SPLASH_WINDOW_OPTIONS: BrowserWindowConstructorOptions = {
  width: 300,
  height: 320,
  frame: false,
  resizable: false,
  minimizable: false,
  maximizable: false,
  fullscreenable: false,
  skipTaskbar: true,
  alwaysOnTop: true,
  center: true,
  show: false
};
