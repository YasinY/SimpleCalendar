import type { PopoverFieldSelectors } from '../popover/popoverFieldSelectors';

export const TIME_PICKER_SELECTORS = {
  FIELD: '[data-time-field]',
  INPUT: 'input[type="time"]',
  TRIGGER: '[data-time-picker-trigger]',
  POPOVER: '[data-time-picker]'
} as const satisfies PopoverFieldSelectors & { FIELD: string };

export const TIME_PICKER_CLASSES = {
  COLUMN: 'time-picker__column',
  OPTION: 'time-picker__option',
  OPTION_SELECTED: 'time-picker__option--selected'
} as const;

export const TIME_PICKER_LABELS = {
  HOURS: 'Stunden',
  MINUTES: 'Minuten'
} as const;

export const TIME_VALUE_DATASET_KEY = 'value';
export const HOUR_STEP = 1;
export const MINUTE_STEP = 5;
export const FALLBACK_HOUR = 9;
export const FALLBACK_MINUTE = 0;
export const NO_TIME = '';
export const CENTER_DIVISOR = 2;
