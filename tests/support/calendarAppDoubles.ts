import { vi, type Mock } from 'vitest';
import type { CalendarAppFactories } from '../../src/renderer/calendarAppFactories';
import type { CalendarElements } from '../../src/renderer/calendarElements';
import type { EventDialogHandlers } from '../../src/renderer/dialogs/eventDialogHandlers';
import type { EventEditor } from '../../src/renderer/dialogs/eventEditor';
import type { SettingsDialogHandlers } from '../../src/renderer/dialogs/settingsDialogHandlers';
import type { SettingsEditor } from '../../src/renderer/dialogs/settingsEditor';
import type { MonthRenderer } from '../../src/renderer/views/monthRenderer';
import type { MonthViewHandlers } from '../../src/renderer/views/monthViewHandlers';
import type { TimeGridHandlers } from '../../src/renderer/views/timeGridHandlers';
import type { TimeGridRenderer } from '../../src/renderer/views/timeGridRenderer';
import type { WeatherBadgeOptions } from '../../src/renderer/weather/weatherBadgeOptions';
import type { WeatherPresenter } from '../../src/renderer/weather/weatherPresenter';
import type { CalendarApi } from '../../src/shared/calendarApi';
import type { CalendarEvent } from '../../src/shared/calendarEvent';
import type { Settings } from '../../src/shared/settings';
import type { ViewMode } from '../../src/shared/viewMode';
import { createCalendarEvent } from './calendarEventFactory';

const ELEMENT_TAGS = { CONTAINER: 'div', LABEL: 'span', BUTTON: 'button' } as const;
const FACTORY_NOT_CALLED = 'factory was not called';
const VIEW_MODE_ORDER: ViewMode[] = ['month', 'week', 'day'];

type MockedMethods<T> = { [Key in keyof T]: T[Key] extends (...args: infer Args) => infer Result ? Mock<(...args: Args) => Result> : T[Key] };

export type CalendarApiMock = MockedMethods<CalendarApi>;

export type MonthViewDouble = MockedMethods<MonthRenderer>;
export type TimeGridViewDouble = MockedMethods<TimeGridRenderer>;
export type EventDialogDouble = MockedMethods<EventEditor>;
export type SettingsDialogDouble = MockedMethods<SettingsEditor>;
export type WeatherDouble = MockedMethods<WeatherPresenter>;

export interface CalendarAppDoubles {
  factories: CalendarAppFactories;
  monthView: MonthViewDouble;
  timeGridView: TimeGridViewDouble;
  eventDialog: EventDialogDouble;
  settingsDialog: SettingsDialogDouble;
  weather: WeatherDouble;
  monthHandlers(): MonthViewHandlers;
  timeGridHandlers(): TimeGridHandlers;
  eventDialogHandlers(): EventDialogHandlers;
  settingsHandlers(): SettingsDialogHandlers;
  weatherOptions(): WeatherBadgeOptions;
}

function requireCaptured<T>(value: T | undefined): T {
  if (value === undefined) throw new Error(FACTORY_NOT_CALLED);
  return value;
}

function createButton(): HTMLButtonElement {
  return document.createElement(ELEMENT_TAGS.BUTTON);
}

function createViewButton(viewMode: ViewMode): HTMLButtonElement {
  const button = createButton();
  button.dataset.viewMode = viewMode;
  return button;
}

export function createCalendarElements(): CalendarElements {
  const calendar = document.createElement(ELEMENT_TAGS.CONTAINER);
  document.body.replaceChildren(calendar);
  return {
    calendar,
    monthName: document.createElement(ELEMENT_TAGS.LABEL),
    yearLabel: document.createElement(ELEMENT_TAGS.LABEL),
    previous: createButton(),
    next: createButton(),
    today: createButton(),
    settingsButton: createButton(),
    viewButtons: VIEW_MODE_ORDER.map(createViewButton)
  };
}

export function createCalendarApiMock(settings: Settings, events: CalendarEvent[]): CalendarApiMock {
  return {
    getEvents: vi.fn<CalendarApi['getEvents']>(async () => events),
    saveEvent: vi.fn<CalendarApi['saveEvent']>(async () => createCalendarEvent()),
    deleteEvent: vi.fn<CalendarApi['deleteEvent']>(async () => true),
    getSettings: vi.fn<CalendarApi['getSettings']>(async () => settings),
    updateSettings: vi.fn<CalendarApi['updateSettings']>(async (patch) => ({ ...settings, ...patch })),
    minimizeWindow: vi.fn<CalendarApi['minimizeWindow']>(),
    toggleMaximizeWindow: vi.fn<CalendarApi['toggleMaximizeWindow']>(),
    hideWindow: vi.fn<CalendarApi['hideWindow']>()
  };
}

export function createCalendarAppDoubles(): CalendarAppDoubles {
  let monthHandlers: MonthViewHandlers | undefined;
  let timeGridHandlers: TimeGridHandlers | undefined;
  let eventDialogHandlers: EventDialogHandlers | undefined;
  let settingsHandlers: SettingsDialogHandlers | undefined;
  let weatherOptions: WeatherBadgeOptions | undefined;

  const monthView: MonthViewDouble = { element: document.createElement(ELEMENT_TAGS.CONTAINER), render: vi.fn() };
  const timeGridView: TimeGridViewDouble = { element: document.createElement(ELEMENT_TAGS.CONTAINER), start: vi.fn(), render: vi.fn() };
  const eventDialog: EventDialogDouble = { openForDate: vi.fn(), openForEvent: vi.fn(), close: vi.fn() };
  const settingsDialog: SettingsDialogDouble = { open: vi.fn(), close: vi.fn() };
  const weather: WeatherDouble = { start: vi.fn(), configure: vi.fn(async () => {}) };

  const factories: CalendarAppFactories = {
    createMonthView: (handlers) => {
      monthHandlers = handlers;
      return monthView;
    },
    createTimeGridView: (handlers) => {
      timeGridHandlers = handlers;
      return timeGridView;
    },
    createEventDialog: (handlers) => {
      eventDialogHandlers = handlers;
      return eventDialog;
    },
    createSettingsDialog: (handlers) => {
      settingsHandlers = handlers;
      return settingsDialog;
    },
    createWeatherBadge: (options) => {
      weatherOptions = options;
      return weather;
    }
  };

  return {
    factories,
    monthView,
    timeGridView,
    eventDialog,
    settingsDialog,
    weather,
    monthHandlers: () => requireCaptured(monthHandlers),
    timeGridHandlers: () => requireCaptured(timeGridHandlers),
    eventDialogHandlers: () => requireCaptured(eventDialogHandlers),
    settingsHandlers: () => requireCaptured(settingsHandlers),
    weatherOptions: () => requireCaptured(weatherOptions)
  };
}
