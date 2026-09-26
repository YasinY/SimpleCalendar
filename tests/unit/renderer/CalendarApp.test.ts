import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarApp } from '@renderer/CalendarApp';
import { SERIES_SCOPES } from '@renderer/constants';
import { groupSegmentsByDate } from '@renderer/events/eventGrouping';
import { toEventKey } from '@renderer/events/eventKey';
import { moveEventTo } from '@renderer/events/eventMove';
import { DEFAULT_SETTINGS } from '@shared/settingsDefaults';
import type { CalendarElements } from '@renderer/calendarElements';
import type { DayColumnLayout } from '@renderer/date/dayColumnLayout';
import type { SettingsPatch } from '@renderer/dialogs/settingsPatch';
import type { MoveTarget } from '@renderer/views/moveTarget';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { EventInput } from '@shared/eventInput';
import type { Recurrence } from '@shared/recurrence';
import type { SeriesScope } from '@shared/seriesScope';
import type { Settings } from '@shared/settings';
import type { WeatherLocation } from '@shared/weatherLocation';
import {
  createCalendarApiMock,
  createCalendarAppDoubles,
  createCalendarElements,
  FAKE_APP_VERSION,
  type CalendarApiMock,
  type CalendarAppDoubles
} from '@tests/support/calendarAppDoubles';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';

const NOW = new Date(2026, 8, 16, 12, 0);
const YEAR = 2026;
const TODAY_ISO = '2026-09-16';
const WEEK_START_ISO = '2026-09-14';
const DROP_TARGET_ISO = '2026-09-20';
const EVENT_ID = 'event-1';
const UNKNOWN_EVENT_KEY = 'missing@2026-09-16';
const SERIES_ID = 'series-1';
const SERIES_OCCURRENCE_ISO = '2026-09-17';
const CANCELLED_SCOPE = null;
const WEEKLY_RECURRENCE: Recurrence = { frequency: 'weekly', interval: 1, until: null };
const EVENT_TITLE = 'Meeting';
const EMPTY_TITLE = '';
const SLOT_TIME = '10:00';
const SLOT_START_MINUTES = 600;
const FLUSH_ROUNDS = 10;
const DAYS_PER_WEEK = 7;
const SINGLE_COLUMN = 1;
const SINGLE_CHILD = 1;
const NATIONAL_HOLIDAY_ISO = '2026-10-03';
const WEATHER_CITY = 'Hamburg';
const OTHER_CITY = 'München';
const WEATHER_LOCATION: WeatherLocation = { city: WEATHER_CITY, name: WEATHER_CITY, latitude: 53.55, longitude: 9.99 };
const ACTIVE_VIEW_CLASS = 'segmented__button--active';

const VIEW_MODES = { MONTH: 'month', WEEK: 'week', DAY: 'day' } as const;

const TITLES = {
  SEPTEMBER: 'September',
  OCTOBER: 'Oktober',
  AUGUST: 'August',
  CURRENT_WEEK: '14. – 20. September',
  NOVEMBER_FIRST_WEEK: '26. Oktober – 1. November',
  TODAY: 'Mittwoch, 16. September',
  YEAR: '2026'
} as const;

const RANGES = {
  SEPTEMBER_GRID: { from: '2026-08-31', to: '2026-10-04' },
  CURRENT_WEEK: { from: WEEK_START_ISO, to: DROP_TARGET_ISO },
  NOVEMBER_FIRST_WEEK: { from: '2026-10-26', to: '2026-11-01' },
  TODAY: { from: TODAY_ISO, to: TODAY_ISO }
} as const;

const STORED_EVENT = createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO, title: EVENT_TITLE });
const RECURRING_EVENT = createCalendarEvent({ id: SERIES_ID, date: SERIES_OCCURRENCE_ISO, title: EVENT_TITLE, recurrence: WEEKLY_RECURRENCE });
const EVENT_KEY = toEventKey(STORED_EVENT);
const RECURRING_EVENT_KEY = toEventKey(RECURRING_EVENT);
const SETTINGS_PATCH: SettingsPatch = {
  holidayRegion: DEFAULT_SETTINGS.holidayRegion,
  theme: DEFAULT_SETTINGS.theme,
  weatherCity: WEATHER_CITY,
  autoUpdate: DEFAULT_SETTINGS.autoUpdate
};
const NEW_EVENT_INPUT: EventInput = { date: TODAY_ISO, time: SLOT_TIME, title: EVENT_TITLE };

let api: CalendarApiMock;
let doubles: CalendarAppDoubles;
let elements: CalendarElements;

async function flushPromises(): Promise<void> {
  for (let round = 0; round < FLUSH_ROUNDS; round += 1) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

async function startApp(settingsOverrides: Partial<Settings> = {}, events: CalendarEvent[] = [STORED_EVENT]): Promise<void> {
  api = createCalendarApiMock({ ...DEFAULT_SETTINGS, weatherCity: WEATHER_CITY, weatherLocation: WEATHER_LOCATION, ...settingsOverrides }, events);
  const app = new CalendarApp(api, elements, doubles.factories);
  await app.start();
  await flushPromises();
}

async function click(button: HTMLButtonElement): Promise<void> {
  button.click();
  await flushPromises();
}

function viewButton(viewMode: string): HTMLButtonElement {
  const button = elements.viewButtons.find((candidate) => candidate.dataset.viewMode === viewMode);
  if (!button) throw new Error(viewMode);
  return button;
}

function isActive(viewMode: string): boolean {
  return viewButton(viewMode).classList.contains(ACTIVE_VIEW_CLASS);
}

function titleText(): { main: string | null; year: string | null } {
  return { main: elements.monthName.textContent, year: elements.yearLabel.textContent };
}

function lastRequestedRange(): unknown {
  return api.getEvents.mock.lastCall?.[0];
}

function lastTimeGridLayout(): DayColumnLayout | undefined {
  return doubles.timeGridView.render.mock.lastCall?.[0];
}

function columnDates(): string[] | undefined {
  return lastTimeGridLayout()?.columns.map((column) => column.iso);
}

function chooseScopeOnce(scope: SeriesScope | null): void {
  doubles.scopePrompt.choose.mockResolvedValueOnce(scope);
}

describe('CalendarApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    doubles = createCalendarAppDoubles();
    elements = createCalendarElements();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('loads the settings and starts the time grid and the weather', async () => {
      await startApp();
      expect(api.getSettings).toHaveBeenCalledOnce();
      expect(doubles.timeGridView.start).toHaveBeenCalledOnce();
      expect(doubles.weather.start).toHaveBeenCalledOnce();
      expect(doubles.weather.configure).toHaveBeenCalledExactlyOnceWith(WEATHER_CITY, WEATHER_LOCATION);
    });

    it('renders the month view with grid, grouped events and holidays', async () => {
      await startApp();
      expect(lastRequestedRange()).toEqual(RANGES.SEPTEMBER_GRID);
      expect(doubles.monthView.render).toHaveBeenCalledOnce();
      expect(doubles.timeGridView.render).not.toHaveBeenCalled();
      const [grid, segmentsByDate, holidaysByDate] = doubles.monthView.render.mock.calls[0];
      expect(grid.years).toEqual([YEAR]);
      expect(grid.cells[0].iso).toBe(RANGES.SEPTEMBER_GRID.from);
      expect(segmentsByDate).toEqual(groupSegmentsByDate([STORED_EVENT]));
      expect(holidaysByDate.has(NATIONAL_HOLIDAY_ISO)).toBe(true);
    });

    it('fills the title and marks the active view button', async () => {
      await startApp();
      expect(titleText()).toEqual({ main: TITLES.SEPTEMBER, year: TITLES.YEAR });
      expect(isActive(VIEW_MODES.MONTH)).toBe(true);
      expect(isActive(VIEW_MODES.WEEK)).toBe(false);
      expect(isActive(VIEW_MODES.DAY)).toBe(false);
    });

    it('mounts the month view element into the container', async () => {
      await startApp();
      expect(elements.calendar.children).toHaveLength(SINGLE_CHILD);
      expect(elements.calendar.firstElementChild).toBe(doubles.monthView.element);
    });

    it('renders seven columns of the current week in the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      expect(lastRequestedRange()).toEqual(RANGES.CURRENT_WEEK);
      expect(titleText()).toEqual({ main: TITLES.CURRENT_WEEK, year: TITLES.YEAR });
      expect(columnDates()).toHaveLength(DAYS_PER_WEEK);
      expect(columnDates()?.[0]).toBe(WEEK_START_ISO);
      expect(doubles.monthView.render).not.toHaveBeenCalled();
      expect(elements.calendar.firstElementChild).toBe(doubles.timeGridView.element);
    });

    it('renders a single column for today in the day view', async () => {
      await startApp({ viewMode: VIEW_MODES.DAY });
      expect(lastRequestedRange()).toEqual(RANGES.TODAY);
      expect(titleText()).toEqual({ main: TITLES.TODAY, year: TITLES.YEAR });
      expect(columnDates()).toEqual([TODAY_ISO]);
      expect(columnDates()).toHaveLength(SINGLE_COLUMN);
      expect(isActive(VIEW_MODES.DAY)).toBe(true);
    });

    it('passes grouped events and holidays to the time grid', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      const [layout, segmentsByDate, holidaysByDate] = doubles.timeGridView.render.mock.calls[0];
      expect(layout.years).toEqual([YEAR]);
      expect(segmentsByDate).toEqual(groupSegmentsByDate([STORED_EVENT]));
      expect(holidaysByDate.size).toBeGreaterThan(0);
    });
  });

  describe('navigation', () => {
    it('moves to the next and previous period', async () => {
      await startApp();
      await click(elements.next);
      expect(titleText().main).toBe(TITLES.OCTOBER);
      await click(elements.previous);
      await click(elements.previous);
      expect(titleText().main).toBe(TITLES.AUGUST);
      expect(api.getEvents).toHaveBeenCalledTimes(4);
    });

    it('jumps forward to today from a past period', async () => {
      await startApp();
      await click(elements.previous);
      await click(elements.today);
      expect(titleText().main).toBe(TITLES.SEPTEMBER);
      expect(lastRequestedRange()).toEqual(RANGES.SEPTEMBER_GRID);
    });

    it('jumps backward to today from a future period', async () => {
      await startApp();
      await click(elements.next);
      await click(elements.today);
      expect(titleText().main).toBe(TITLES.SEPTEMBER);
      expect(lastRequestedRange()).toEqual(RANGES.SEPTEMBER_GRID);
    });

    it('keeps the mounted view when rendering the same view again', async () => {
      await startApp();
      const replaceSpy = vi.spyOn(elements.calendar, 'replaceChildren');
      await click(elements.next);
      expect(replaceSpy).not.toHaveBeenCalled();
      expect(elements.calendar.children).toHaveLength(SINGLE_CHILD);
      expect(doubles.monthView.render).toHaveBeenCalledTimes(2);
    });
  });

  describe('view switcher', () => {
    it('switches the view, persists it and keeps today in sight', async () => {
      await startApp();
      await click(viewButton(VIEW_MODES.WEEK));
      expect(api.updateSettings).toHaveBeenCalledExactlyOnceWith({ viewMode: VIEW_MODES.WEEK });
      expect(lastRequestedRange()).toEqual(RANGES.CURRENT_WEEK);
      expect(titleText().main).toBe(TITLES.CURRENT_WEEK);
      expect(isActive(VIEW_MODES.WEEK)).toBe(true);
      expect(isActive(VIEW_MODES.MONTH)).toBe(false);
      expect(elements.calendar.firstElementChild).toBe(doubles.timeGridView.element);
      expect(elements.calendar.children).toHaveLength(SINGLE_CHILD);
    });

    it('switches from the week view to today in the day view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      await click(viewButton(VIEW_MODES.DAY));
      expect(api.updateSettings).toHaveBeenCalledWith({ viewMode: VIEW_MODES.DAY });
      expect(columnDates()).toEqual([TODAY_ISO]);
    });

    it('ignores clicks on the already active view', async () => {
      await startApp();
      await click(viewButton(VIEW_MODES.MONTH));
      expect(api.updateSettings).not.toHaveBeenCalled();
      expect(api.getEvents).toHaveBeenCalledOnce();
    });

    it('anchors to the period start when the period does not contain today', async () => {
      await startApp();
      await click(elements.next);
      await click(elements.next);
      await click(viewButton(VIEW_MODES.WEEK));
      expect(titleText().main).toBe(TITLES.NOVEMBER_FIRST_WEEK);
      expect(lastRequestedRange()).toEqual(RANGES.NOVEMBER_FIRST_WEEK);
    });
  });

  describe('view handlers', () => {
    it('opens the event dialog for an activated day', async () => {
      await startApp();
      doubles.monthHandlers().onDayActivate(TODAY_ISO);
      expect(doubles.eventDialog.openForDate).toHaveBeenCalledExactlyOnceWith(TODAY_ISO);
    });

    it('opens the event dialog with the time of an activated slot', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      doubles.timeGridHandlers().onSlotActivate(TODAY_ISO, SLOT_TIME);
      expect(doubles.eventDialog.openForDate).toHaveBeenCalledExactlyOnceWith(TODAY_ISO, SLOT_TIME);
    });

    it('opens a known event from the month view', async () => {
      await startApp();
      doubles.monthHandlers().onEventActivate(EVENT_KEY);
      expect(doubles.eventDialog.openForEvent).toHaveBeenCalledExactlyOnceWith(STORED_EVENT);
    });

    it('opens the activated occurrence of a series by its key', async () => {
      await startApp({}, [STORED_EVENT, RECURRING_EVENT]);
      doubles.monthHandlers().onEventActivate(RECURRING_EVENT_KEY);
      expect(doubles.eventDialog.openForEvent).toHaveBeenCalledExactlyOnceWith(RECURRING_EVENT);
    });

    it('opens a known event from the time grid', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      doubles.timeGridHandlers().onEventActivate(EVENT_KEY);
      expect(doubles.eventDialog.openForEvent).toHaveBeenCalledExactlyOnceWith(STORED_EVENT);
    });

    it('ignores the activation of an unknown event', async () => {
      await startApp();
      doubles.monthHandlers().onEventActivate(UNKNOWN_EVENT_KEY);
      expect(doubles.eventDialog.openForEvent).not.toHaveBeenCalled();
    });

    it('saves an event dropped on a day and reloads', async () => {
      await startApp();
      const target: MoveTarget = { date: DROP_TARGET_ISO };
      doubles.monthHandlers().onEventDrop(EVENT_KEY, target);
      await flushPromises();
      expect(doubles.scopePrompt.choose).not.toHaveBeenCalled();
      expect(api.saveEvent).toHaveBeenCalledExactlyOnceWith(moveEventTo(STORED_EVENT, target));
      expect(api.getEvents).toHaveBeenCalledTimes(2);
      expect(doubles.monthView.render).toHaveBeenCalledTimes(2);
    });

    it('saves only the dropped occurrence of a series when chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      const target: MoveTarget = { date: DROP_TARGET_ISO };
      chooseScopeOnce(SERIES_SCOPES.OCCURRENCE);
      doubles.monthHandlers().onEventDrop(RECURRING_EVENT_KEY, target);
      await flushPromises();
      expect(doubles.scopePrompt.choose).toHaveBeenCalledOnce();
      expect(api.saveOccurrence).toHaveBeenCalledExactlyOnceWith(moveEventTo(RECURRING_EVENT, target));
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('does not move a dropped occurrence when the scope prompt is cancelled', async () => {
      await startApp({}, [RECURRING_EVENT]);
      chooseScopeOnce(CANCELLED_SCOPE);
      doubles.monthHandlers().onEventDrop(RECURRING_EVENT_KEY, { date: DROP_TARGET_ISO });
      await flushPromises();
      expect(api.saveOccurrence).not.toHaveBeenCalled();
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(api.getEvents).toHaveBeenCalledOnce();
    });

    it('saves an event dropped on a time slot and reloads', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      const target: MoveTarget = { date: DROP_TARGET_ISO, startMinutes: SLOT_START_MINUTES };
      doubles.timeGridHandlers().onEventDrop(EVENT_KEY, target);
      await flushPromises();
      expect(api.saveEvent).toHaveBeenCalledExactlyOnceWith(moveEventTo(STORED_EVENT, target));
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('ignores drops of unknown events', async () => {
      await startApp();
      doubles.monthHandlers().onEventDrop(UNKNOWN_EVENT_KEY, { date: DROP_TARGET_ISO });
      await flushPromises();
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(api.getEvents).toHaveBeenCalledOnce();
    });
  });

  describe('event dialog handlers', () => {
    it('does not save an event without title', async () => {
      await startApp();
      doubles.eventDialogHandlers().onSubmit({ ...NEW_EVENT_INPUT, title: EMPTY_TITLE }, null);
      await flushPromises();
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(doubles.eventDialog.close).not.toHaveBeenCalled();
    });

    it('saves an event with title, closes the dialog and reloads', async () => {
      await startApp();
      doubles.eventDialogHandlers().onSubmit(NEW_EVENT_INPUT, null);
      await flushPromises();
      expect(doubles.scopePrompt.choose).not.toHaveBeenCalled();
      expect(api.saveEvent).toHaveBeenCalledExactlyOnceWith(NEW_EVENT_INPUT);
      expect(doubles.eventDialog.close).toHaveBeenCalledOnce();
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('saves an edited single event without asking for a scope', async () => {
      await startApp();
      doubles.eventDialogHandlers().onSubmit(NEW_EVENT_INPUT, STORED_EVENT);
      await flushPromises();
      expect(doubles.scopePrompt.choose).not.toHaveBeenCalled();
      expect(api.saveEvent).toHaveBeenCalledExactlyOnceWith(NEW_EVENT_INPUT);
    });

    it('saves the whole series when the series scope is chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      doubles.eventDialogHandlers().onSubmit(NEW_EVENT_INPUT, RECURRING_EVENT);
      await flushPromises();
      expect(doubles.scopePrompt.choose).toHaveBeenCalledOnce();
      expect(api.saveEvent).toHaveBeenCalledExactlyOnceWith(NEW_EVENT_INPUT);
      expect(api.saveOccurrence).not.toHaveBeenCalled();
      expect(doubles.eventDialog.close).toHaveBeenCalledOnce();
    });

    it('saves only the occurrence when the occurrence scope is chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      chooseScopeOnce(SERIES_SCOPES.OCCURRENCE);
      doubles.eventDialogHandlers().onSubmit(NEW_EVENT_INPUT, RECURRING_EVENT);
      await flushPromises();
      expect(api.saveOccurrence).toHaveBeenCalledExactlyOnceWith(NEW_EVENT_INPUT);
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(doubles.eventDialog.close).toHaveBeenCalledOnce();
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('keeps the dialog open without saving when the scope prompt is cancelled', async () => {
      await startApp({}, [RECURRING_EVENT]);
      chooseScopeOnce(CANCELLED_SCOPE);
      doubles.eventDialogHandlers().onSubmit(NEW_EVENT_INPUT, RECURRING_EVENT);
      await flushPromises();
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(api.saveOccurrence).not.toHaveBeenCalled();
      expect(doubles.eventDialog.close).not.toHaveBeenCalled();
      expect(api.getEvents).toHaveBeenCalledOnce();
    });

    it('deletes an event, closes the dialog and reloads', async () => {
      await startApp();
      doubles.eventDialogHandlers().onDelete(STORED_EVENT);
      await flushPromises();
      expect(doubles.scopePrompt.choose).not.toHaveBeenCalled();
      expect(api.deleteEvent).toHaveBeenCalledExactlyOnceWith(EVENT_ID);
      expect(doubles.eventDialog.close).toHaveBeenCalledOnce();
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('deletes the whole series when the series scope is chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      doubles.eventDialogHandlers().onDelete(RECURRING_EVENT);
      await flushPromises();
      expect(doubles.scopePrompt.choose).toHaveBeenCalledOnce();
      expect(api.deleteEvent).toHaveBeenCalledExactlyOnceWith(SERIES_ID);
      expect(api.deleteOccurrence).not.toHaveBeenCalled();
    });

    it('deletes only the occurrence when the occurrence scope is chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      chooseScopeOnce(SERIES_SCOPES.OCCURRENCE);
      doubles.eventDialogHandlers().onDelete(RECURRING_EVENT);
      await flushPromises();
      expect(api.deleteOccurrence).toHaveBeenCalledExactlyOnceWith({ id: SERIES_ID, occurrenceDate: SERIES_OCCURRENCE_ISO });
      expect(api.deleteEvent).not.toHaveBeenCalled();
      expect(doubles.eventDialog.close).toHaveBeenCalledOnce();
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('keeps the dialog open without deleting when the scope prompt is cancelled', async () => {
      await startApp({}, [RECURRING_EVENT]);
      chooseScopeOnce(CANCELLED_SCOPE);
      doubles.eventDialogHandlers().onDelete(RECURRING_EVENT);
      await flushPromises();
      expect(api.deleteEvent).not.toHaveBeenCalled();
      expect(api.deleteOccurrence).not.toHaveBeenCalled();
      expect(doubles.eventDialog.close).not.toHaveBeenCalled();
      expect(api.getEvents).toHaveBeenCalledOnce();
    });
  });

  describe('settings', () => {
    it('shows the app version in the settings dialog', async () => {
      await startApp();
      expect(api.getAppVersion).toHaveBeenCalledOnce();
      expect(doubles.settingsDialog.showVersion).toHaveBeenCalledExactlyOnceWith(FAKE_APP_VERSION);
    });

    it('opens the settings dialog with the loaded settings', async () => {
      await startApp();
      const loadedSettings = await api.getSettings.mock.results[0].value;
      await click(elements.settingsButton);
      expect(doubles.settingsDialog.open).toHaveBeenCalledExactlyOnceWith(loadedSettings);
    });

    it('saves unchanged city settings without reconfiguring the weather', async () => {
      await startApp();
      doubles.settingsHandlers().onSave(SETTINGS_PATCH);
      await flushPromises();
      expect(api.updateSettings).toHaveBeenCalledExactlyOnceWith(SETTINGS_PATCH);
      expect(doubles.settingsDialog.close).toHaveBeenCalledOnce();
      expect(doubles.monthView.render).toHaveBeenCalledTimes(2);
      expect(doubles.weather.configure).toHaveBeenCalledOnce();
    });

    it('reconfigures the weather when the city changes', async () => {
      await startApp();
      doubles.settingsHandlers().onSave({ ...SETTINGS_PATCH, weatherCity: OTHER_CITY });
      await flushPromises();
      expect(doubles.settingsDialog.close).toHaveBeenCalledOnce();
      expect(doubles.weather.configure).toHaveBeenCalledTimes(2);
      expect(doubles.weather.configure).toHaveBeenLastCalledWith(OTHER_CITY, WEATHER_LOCATION);
    });

    it('stores a resolved weather location', async () => {
      await startApp();
      doubles.weatherOptions().onLocationResolved(WEATHER_LOCATION);
      expect(api.updateSettings).toHaveBeenCalledExactlyOnceWith({ weatherLocation: WEATHER_LOCATION });
    });
  });
});
