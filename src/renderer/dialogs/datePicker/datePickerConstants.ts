export const DATE_PICKER_SELECTORS = {
  FIELD: '[data-date-field]',
  INPUT: 'input[type="date"]',
  TRIGGER: '[data-date-picker-trigger]',
  POPOVER: '[data-date-picker]'
} as const;

export const DATE_PICKER_CLASSES = {
  HEADER: 'date-picker__header',
  TITLE: 'date-picker__title',
  NAV: 'date-picker__nav',
  WEEKDAYS: 'date-picker__weekdays',
  WEEKDAY: 'date-picker__weekday',
  GRID: 'date-picker__grid',
  DAY: 'date-picker__day',
  DAY_OUTSIDE: 'date-picker__day--outside',
  DAY_TODAY: 'date-picker__day--today',
  DAY_SELECTED: 'date-picker__day--selected',
  FOOTER: 'date-picker__footer',
  ACTION: 'date-picker__action'
} as const;

export const DATE_PICKER_LABELS = {
  PREVIOUS_MONTH: 'Vorheriger Monat',
  NEXT_MONTH: 'Nächster Monat',
  CLEAR: 'Löschen',
  TODAY: 'Heute'
} as const;

export const DATE_PICKER_GLYPHS = {
  PREVIOUS: '‹',
  NEXT: '›'
} as const;

export const DATE_PICKER_EVENTS = {
  TOGGLE: 'toggle',
  INPUT: 'input',
  CHANGE: 'change'
} as const;

export const POPOVER_OPEN_STATE = 'open';
export const DATE_DATASET_KEY = 'date';
export const PREVIOUS_MONTH_STEP = -1;
export const NEXT_MONTH_STEP = 1;
export const TITLE_SEPARATOR = ' ';
export const NOT_FOCUSABLE_BY_TAB = -1;
