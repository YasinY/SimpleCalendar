import type { SelectOption } from './selectOption';
import type { RecurrenceFrequency } from '@shared/recurrenceFrequency';
import type { SeriesScope } from '@shared/seriesScope';
import type { Theme } from '@shared/theme';
import type { ViewMode } from '@shared/viewMode';

export const DAYS_PER_WEEK = 7;
export const FIRST_MONTH_DAY = 1;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export const DAY_SUFFIX = '.';

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export const VIEW_MODES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
} as const satisfies Record<string, ViewMode>;

export const DEFAULT_VIEW_MODE: ViewMode = VIEW_MODES.MONTH;

export const THEMES = {
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark'
} as const satisfies Record<string, Theme>;

export const THEME_OPTIONS: SelectOption[] = [
  { value: THEMES.SYSTEM, label: 'System' },
  { value: THEMES.LIGHT, label: 'Hell' },
  { value: THEMES.DARK, label: 'Dunkel' }
];

export const DEFAULT_EVENT_TIME = '09:00';
export const ALL_DAY_TIME = '00:00';
export const NO_END_TIME = '';
export const NO_NOTES = '';
export const ALL_DAY_LABEL = 'Ganztägig';
export const TIME_RANGE_SEPARATOR = '–';
export const TOOLTIP_SEPARATOR = '\n';
export const MAX_DURATION_STEPS = 4;
export const MIN_STRETCHED_DURATION_STEPS = 2;
export const DEFAULT_BLOCK_MINUTES = 60;
export const DRAG_SNAP_MINUTES = 15;
export const INITIAL_SCROLL_HOUR = 7;
export const CURRENT_TIME_TICK_MS = 60000;

export const EVENT_DURATION_CLASS_PREFIX = 'event--duration-';
export const EVENT_COLOR_CLASS_PREFIX = 'event--color-';
export const SWATCH_CLASS_PREFIX = 'swatch--';

export const REMINDER_NONE_VALUE = '';

export const REMINDER_OPTIONS: SelectOption[] = [
  { value: REMINDER_NONE_VALUE, label: 'Keine' },
  { value: '0', label: 'Zur Zeit des Ereignisses' },
  { value: '5', label: '5 Minuten vorher' },
  { value: '15', label: '15 Minuten vorher' },
  { value: '30', label: '30 Minuten vorher' },
  { value: '60', label: '1 Stunde vorher' },
  { value: '1440', label: '1 Tag vorher' }
];

export const DIALOG_LABELS = {
  CREATE_TITLE: 'Neues Ereignis',
  EDIT_TITLE: 'Ereignis bearbeiten',
  CREATE_SUBMIT: 'Hinzufügen',
  EDIT_SUBMIT: 'Sichern'
} as const;

export const NO_DATE = '';
export const NO_DAY_OFFSET = 0;
export const EVENT_KEY_SEPARATOR = '@';
export const SEGMENT_LABELS = {
  FROM: 'ab ',
  UNTIL: 'bis '
} as const;

export const RECURRENCE_NONE_VALUE = '';
export const DEFAULT_RECURRENCE_INTERVAL = 1;
export const RECURRENCE_OPTIONS: SelectOption[] = [
  { value: RECURRENCE_NONE_VALUE, label: 'Nie' },
  { value: 'daily', label: 'Täglich' },
  { value: 'weekly', label: 'Wöchentlich' },
  { value: 'monthly', label: 'Monatlich' },
  { value: 'yearly', label: 'Jährlich' }
];
export const RECURRENCE_UNIT_LABELS: Record<RecurrenceFrequency, string> = {
  daily: 'Tage',
  weekly: 'Wochen',
  monthly: 'Monate',
  yearly: 'Jahre'
};

export const SERIES_SCOPES = {
  OCCURRENCE: 'occurrence',
  SERIES: 'series'
} as const satisfies Record<string, SeriesScope>;

export const CSS_CLASSES = {
  MONTH_VIEW: 'month-view',
  WEEKDAYS: 'weekdays',
  WEEKDAY: 'weekdays__label',
  GRID: 'grid',
  DAY: 'day',
  DAY_OUTSIDE: 'day--outside',
  DAY_TODAY: 'day--today',
  DAY_HOLIDAY: 'day--holiday',
  DAY_HOLIDAY_NAME: 'day__holiday',
  DAY_HEADER: 'day__header',
  DAY_NUMBER: 'day__number',
  DAY_EVENTS: 'day__events',
  EVENT: 'event',
  EVENT_BLOCK: 'event--block',
  EVENT_CONTINUES_BEFORE: 'event--continues-before',
  EVENT_CONTINUES_AFTER: 'event--continues-after',
  EVENT_RECURRING: 'event--recurring',
  EVENT_TIME: 'event__time',
  EVENT_TITLE: 'event__title',
  DROP_TARGET: 'drop-target',
  TIME_GRID: 'time-grid',
  TIME_GRID_HEADER: 'time-grid__header',
  TIME_GRID_CORNER: 'time-grid__corner',
  TIME_GRID_ALL_DAY: 'time-grid__all-day',
  TIME_GRID_ALL_DAY_CELL: 'time-grid__all-day-cell',
  TIME_GRID_ALL_DAY_CELL_TODAY: 'time-grid__all-day-cell--today',
  TIME_GRID_DAY: 'time-grid__day',
  TIME_GRID_DAY_TODAY: 'time-grid__day--today',
  TIME_GRID_DAY_HOLIDAY: 'time-grid__day--holiday',
  TIME_GRID_DAY_NAME: 'time-grid__day-name',
  TIME_GRID_DAY_NUMBER: 'time-grid__day-number',
  TIME_GRID_HOLIDAY_NAME: 'time-grid__holiday',
  TIME_GRID_BODY: 'time-grid__body',
  TIME_GRID_HOURS: 'time-grid__hours',
  TIME_GRID_HOUR: 'time-grid__hour',
  TIME_GRID_COLUMNS: 'time-grid__columns',
  TIME_GRID_COLUMN: 'time-grid__column',
  TIME_GRID_COLUMN_TODAY: 'time-grid__column--today',
  TIME_GRID_COLUMN_HOLIDAY: 'time-grid__column--holiday',
  NOW_LINE: 'now-line',
  SEGMENTED_ACTIVE: 'segmented__button--active',
  SWATCH: 'swatch',
  SWATCH_INPUT: 'swatch__input',
  SWATCH_CIRCLE: 'swatch__circle'
} as const;

export const CSS_VARIABLES = {
  DAY_COUNT: '--day-count',
  HOUR: '--hour',
  BLOCK_START: '--block-start',
  BLOCK_MINUTES: '--block-minutes',
  BLOCK_COLUMN: '--block-column',
  BLOCK_COLUMNS: '--block-columns'
} as const;

export const DATASET_KEYS = {
  DATE: 'date',
  EVENT_KEY: 'eventKey',
  VIEW_MODE: 'viewMode'
} as const;

export const DRAG_DATA_TYPE = 'text/plain';
export const DROP_EFFECT_MOVE = 'move';

export const TRANSITION_DIRECTIONS = {
  FORWARD: 'forward',
  BACKWARD: 'backward',
  SWITCH: 'switch',
  PICKER_FORWARD: 'picker-forward',
  PICKER_BACKWARD: 'picker-backward'
} as const;

export type TransitionDirection = (typeof TRANSITION_DIRECTIONS)[keyof typeof TRANSITION_DIRECTIONS];

export const TRANSITION_DATASET_KEY = 'transition';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export const GRID_WEEK_CLASS_PREFIX = 'grid--weeks-';
export const HOLIDAY_NAME_SEPARATOR = ', ';
export const ESCAPE_KEY = 'Escape';
export const HIDDEN_ATTRIBUTE = 'hidden';

export const WINDOW_CONTROL_IDS = {
  CLOSE: 'windowClose',
  MINIMIZE: 'windowMinimize',
  MAXIMIZE: 'windowMaximize'
} as const;
