export const CITY_PICKER_SELECTORS = {
  INPUT: 'input',
  POPOVER: '[data-city-picker]'
} as const;

export const CITY_PICKER_CLASSES = {
  OPTION: 'city-picker__option',
  OPTION_ACTIVE: 'city-picker__option--active',
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
