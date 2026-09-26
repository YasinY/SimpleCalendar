export const SPLASH_ELEMENT_IDS = {
  LOGO: 'logo',
  STATUS: 'statusText',
  PROGRESS: 'progress',
  PROGRESS_BAR: 'progressBar',
  VERSION: 'versionLabel'
} as const;

export const SPLASH_CSS_CLASSES = {
  LOGO_BUSY: 'logo--busy'
} as const;

export const STATUS_TEXTS = {
  STARTING: 'Starte …',
  CHECKING: 'Suche nach Updates …',
  DOWNLOADING_PREFIX: 'Lade Update ',
  INSTALLING_PREFIX: 'Installiere Update ',
  UP_TO_DATE: 'Alles aktuell'
} as const;

export const VERSION_PREFIX = 'Version ';
export const PERCENT_SEPARATOR = ' … ';
export const PERCENT_SUFFIX = ' %';
export const PERCENT_UNIT = '%';
export const NO_PERCENT = 0;
export const UNKNOWN_VERSION = '';
