export const CITY_PICKER_SELECTORS = {
  INPUT: 'input',
  TRIGGER: '[data-city-picker-trigger]',
  POPOVER: '[data-city-picker]'
} as const;

export const CITY_PICKER_CLASSES = {
  OPTION: 'city-picker__option',
  OPTION_ACTIVE: 'city-picker__option--active',
  SPACER: 'city-picker__spacer',
  NAME: 'city-picker__name',
  DETAILS: 'city-picker__details'
} as const;

export const CITY_PICKER_KEYS = {
  NEXT: 'ArrowDown',
  PREVIOUS: 'ArrowUp',
  CONFIRM: 'Enter'
} as const;

export const CITY_PICKER_ARIA = {
  EXPANDED: 'aria-expanded',
  ACTIVE_DESCENDANT: 'aria-activedescendant',
  SELECTED: 'aria-selected',
  ROLE: 'role'
} as const;

export const CITY_OPTION_ROLE = 'option';
export const CITY_OPTION_ID_PREFIX = 'cityOption-';
export const NO_ACTIVE_OPTION = -1;
export const FIRST_OPTION = 0;
export const OPTION_STEP = 1;
export const CITY_SEARCH_WARNING = 'city search failed';
export const CITY_OPTION_HEIGHT_PX = 36;
export const CITY_OPTION_HEIGHT_PROPERTY = '--city-option-height';
export const VISIBLE_CITY_OPTIONS = 8;
export const OVERSCAN_CITY_OPTIONS = 4;
export const PIXEL_UNIT = 'px';
export const SCROLL_TOP = 0;
