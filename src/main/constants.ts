import path from 'node:path';
import type { BrowserWindowConstructorOptions } from 'electron';

export const APP_USER_MODEL_ID = 'dev.yazici.simplecalendar';
export const APP_LOCALE = 'de-DE';
export const DATABASE_FILE_NAME = 'calendar.db';
export const LEGACY_EVENTS_FILE_NAME = 'events.json';
export const LEGACY_EVENTS_MIGRATED_SUFFIX = '.migrated';
export const SETTINGS_FILE_NAME = 'settings.json';
export const HIDDEN_LAUNCH_FLAG = '--hidden';
export const USER_DATA_ENV_VARIABLE = 'SIMPLECALENDAR_USER_DATA';

export const THEME_BACKGROUNDS = {
  light: '#ffffff',
  dark: '#1c1c1e'
} as const;

export const MILLISECONDS_PER_MINUTE = 60000;
export const MINUTES_PER_DAY = 1440;
export const REMINDER_CHECK_INTERVAL_MS = 30000;

export const PRELOAD_PATH = path.join(__dirname, 'preload.js');
export const RENDERER_ENTRY_PATH = path.join(__dirname, '..', 'renderer', 'index.html');
export const TRAY_ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'trayIcon.png');
export const APP_ICON_PATH = path.join(__dirname, '..', '..', 'assets', 'icon.png');

export const WINDOW_OPTIONS: BrowserWindowConstructorOptions = {
  width: 1218,
  height: 780,
  minWidth: 1218,
  minHeight: 620,
  show: false,
  titleBarStyle: 'hidden',
  icon: APP_ICON_PATH
};
export const MIGRATIONS_PATH = path.join(__dirname, '..', '..', 'drizzle');

export const TRAY_TOOLTIP = 'SimpleCalendar';
export const TRAY_LABELS = {
  OPEN: 'Kalender öffnen',
  QUIT: 'Beenden'
} as const;

export const NOTIFICATION_DATE_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
export const NOTIFICATION_BODY_SUFFIX = ' Uhr';
export const NOTIFICATION_BODY_SEPARATOR = ' um ';
