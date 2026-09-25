import { requireElementById } from './elements';
import type { CalendarElements } from '@renderer/calendarElements';

const ELEMENT_IDS = {
  MONTH_NAME: 'monthName',
  YEAR_LABEL: 'yearLabel',
  CALENDAR: 'calendar',
  PREVIOUS: 'previousPeriod',
  TODAY: 'todayButton',
  NEXT: 'nextPeriod',
  VIEW_SWITCHER: 'viewSwitcher',
  SETTINGS_BUTTON: 'settingsButton'
} as const;

const VIEW_BUTTON_SELECTOR = '[data-view-mode]';

export function queryCalendarElements(): CalendarElements {
  return {
    calendar: requireElementById(ELEMENT_IDS.CALENDAR),
    monthName: requireElementById(ELEMENT_IDS.MONTH_NAME),
    yearLabel: requireElementById(ELEMENT_IDS.YEAR_LABEL),
    previous: requireElementById(ELEMENT_IDS.PREVIOUS),
    next: requireElementById(ELEMENT_IDS.NEXT),
    today: requireElementById(ELEMENT_IDS.TODAY),
    settingsButton: requireElementById(ELEMENT_IDS.SETTINGS_BUTTON),
    viewButtons: [...requireElementById(ELEMENT_IDS.VIEW_SWITCHER).querySelectorAll<HTMLButtonElement>(VIEW_BUTTON_SELECTOR)]
  };
}
