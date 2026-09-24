import { CalendarApp } from './CalendarApp';
import { DiscardPrompt } from './dialogs/DiscardPrompt';
import { EventDialog } from './dialogs/EventDialog';
import { SettingsDialog } from './dialogs/SettingsDialog';
import { requireElementById } from './dom/elements';
import { queryCalendarElements } from './dom/queryCalendarElements';
import { MonthView } from './views/MonthView';
import { TimeGridView } from './views/TimeGridView';
import { WeatherBadge } from './weather/WeatherBadge';
import type { CalendarAppFactories } from './calendarAppFactories';
import type { CalendarApi } from '../shared/calendarApi';

const OVERLAY_IDS = {
  EVENT_DIALOG: 'dialogOverlay',
  SETTINGS_DIALOG: 'settingsOverlay',
  DISCARD_PROMPT: 'discardOverlay',
  WEATHER_BADGE: 'weatherBadge'
} as const;

function createFactories(): CalendarAppFactories {
  const discardPrompt = new DiscardPrompt(requireElementById(OVERLAY_IDS.DISCARD_PROMPT));
  return {
    createMonthView: (handlers) => new MonthView(handlers),
    createTimeGridView: (handlers) => new TimeGridView(handlers),
    createEventDialog: (handlers) => new EventDialog(requireElementById(OVERLAY_IDS.EVENT_DIALOG), handlers, discardPrompt),
    createSettingsDialog: (handlers) => new SettingsDialog(requireElementById(OVERLAY_IDS.SETTINGS_DIALOG), handlers, discardPrompt),
    createWeatherBadge: (options) => new WeatherBadge(requireElementById(OVERLAY_IDS.WEATHER_BADGE), options)
  };
}

export function createCalendarApp(api: CalendarApi): CalendarApp {
  return new CalendarApp(api, queryCalendarElements(), createFactories());
}
