import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCalendarApp } from '@renderer/createCalendarApp';
import { toEventKey } from '@renderer/events/eventKey';
import { fetchCurrentWeather, geocodeCity } from '@renderer/weather/weatherApi';
import { DEFAULT_SETTINGS } from '@shared/settingsDefaults';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { Recurrence } from '@shared/recurrence';
import type { Settings } from '@shared/settings';
import type { WeatherLocation } from '@shared/weatherLocation';
import { createCalendarApiMock, type CalendarApiMock } from '@tests/support/calendarAppDoubles';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import { mountIndexDocument, requireById } from '@tests/support/indexDocument';

vi.mock('@renderer/weather/weatherApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@renderer/weather/weatherApi')>()),
  geocodeCity: vi.fn(),
  fetchCurrentWeather: vi.fn()
}));

const NOW = new Date(2026, 8, 16, 12, 0);
const TODAY_ISO = '2026-09-16';
const DROP_TARGET_ISO = '2026-09-20';
const EVENT_ID = 'event-1';
const UNKNOWN_EVENT_KEY = 'missing@2026-09-16';
const SERIES_ID = 'series-1';
const TRIP_ID = 'trip';
const TRIP_END_ISO = '2026-09-18';
const TRIP_MIDDLE_ISO = '2026-09-17';
const WEEKLY_RECURRENCE: Recurrence = { frequency: 'weekly', interval: 1, until: null };
const NO_DAY_OFFSET = 0;
const SECOND_DAY_OFFSET = 1;
const KEEP_TIME = null;
const GRAB_OFFSET_MINUTES = 0;
const TRIP_SHIFTED_START_ISO = '2026-09-19';
const TRIP_SHIFTED_END_ISO = '2026-09-21';
const EVENT_TITLE = 'Meeting';
const WEATHER_CITY = 'Hamburg';
const WEATHER_LOCATION: WeatherLocation = { city: WEATHER_CITY, name: WEATHER_CITY, latitude: 53.55, longitude: 9.99 };
const CURRENT_WEATHER = { temperature: 18, code: 0 };
const COLUMN_HEIGHT = 1440;
const SLOT_POINTER_Y = 600;
const SLOT_TIME = '10:00';
const FLUSH_ROUNDS = 10;

const VIEW_MODES = { MONTH: 'month', WEEK: 'week', DAY: 'day' } as const;
const ACTIVE_VIEW_CLASS = 'segmented__button--active';
const HIDDEN_ATTRIBUTE = 'hidden';
const DRAG_DATA_TYPE = 'text/plain';

const ELEMENT_IDS = {
  MONTH_NAME: 'monthName',
  YEAR_LABEL: 'yearLabel',
  CALENDAR: 'calendar',
  PREVIOUS: 'previousPeriod',
  NEXT: 'nextPeriod',
  TODAY: 'todayButton',
  SETTINGS_BUTTON: 'settingsButton',
  DIALOG_OVERLAY: 'dialogOverlay',
  SETTINGS_OVERLAY: 'settingsOverlay',
  SCOPE_OVERLAY: 'scopeOverlay'
} as const;

const SELECTORS = {
  MONTH_VIEW: '.month-view',
  TIME_GRID: '.time-grid',
  TIME_GRID_COLUMN: '.time-grid__column',
  TIME_GRID_ALL_DAY_CELL: '.time-grid__all-day-cell',
  EVENT: '.event',
  EVENT_BLOCK: '.event--block',
  SETTINGS_FORM: '[data-settings-form]',
  SETTINGS_CITY: '[data-settings-city]',
  DIALOG_FORM: '[data-dialog-form]',
  DIALOG_TITLE: '[data-dialog-title]',
  DIALOG_TIME: '[data-dialog-time]',
  DIALOG_DATE: '[data-dialog-date]',
  DIALOG_HEADING: '[data-dialog-heading]',
  DIALOG_DELETE: '[data-dialog-delete]',
  SCOPE_OCCURRENCE: '[data-scope-occurrence]',
  SCOPE_SERIES: '[data-scope-series]',
  SCOPE_CANCEL: '[data-scope-cancel]'
} as const;

const TITLES = {
  SEPTEMBER: 'September',
  OCTOBER: 'Oktober',
  AUGUST: 'August',
  CURRENT_WEEK: '14. – 20. September',
  NOVEMBER_FIRST_WEEK: '26. Oktober – 1. November',
  TODAY: 'Mittwoch, 16. September',
  YEAR: '2026',
  LONG_TODAY: 'Mittwoch, 16. September 2026',
  EDIT_DIALOG: 'Ereignis bearbeiten'
} as const;

const RANGES = {
  SEPTEMBER_GRID: { from: '2026-08-31', to: '2026-10-04' },
  CURRENT_WEEK: { from: '2026-09-14', to: '2026-09-20' },
  TODAY: { from: TODAY_ISO, to: TODAY_ISO }
} as const;

let api: CalendarApiMock;

const STORED_EVENT = createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO, title: EVENT_TITLE });
const RECURRING_EVENT = createCalendarEvent({ id: SERIES_ID, date: TODAY_ISO, title: EVENT_TITLE, recurrence: WEEKLY_RECURRENCE });
const TRIP_EVENT = createCalendarEvent({ id: TRIP_ID, date: TODAY_ISO, endDate: TRIP_END_ISO, allDay: true, title: EVENT_TITLE });
const EVENT_KEY = toEventKey(STORED_EVENT);
const TRIP_KEY = toEventKey(TRIP_EVENT);

async function flushPromises(): Promise<void> {
  for (let round = 0; round < FLUSH_ROUNDS; round += 1) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

async function startApp(settingsOverrides: Partial<Settings> = {}, events: CalendarEvent[] = []): Promise<void> {
  api = createCalendarApiMock({ ...DEFAULT_SETTINGS, ...settingsOverrides }, events);
  await createCalendarApp(api).start();
  await flushPromises();
}

function query<T extends HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(selector);
  return element;
}

function dayCell(isoDate: string): HTMLElement {
  return query(`.day[data-date="${isoDate}"]`);
}

function viewButton(viewMode: string): HTMLButtonElement {
  return query(`[data-view-mode="${viewMode}"]`);
}

async function click(element: Element): Promise<void> {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await flushPromises();
}

async function submit(form: HTMLFormElement): Promise<void> {
  form.dispatchEvent(new Event('submit', { cancelable: true }));
  await flushPromises();
}

async function dropOn(zone: HTMLElement, eventKey: string, dayOffset = NO_DAY_OFFSET, offsetMinutes: number | null = GRAB_OFFSET_MINUTES, clientY = 0): Promise<void> {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify({ eventKey, dayOffset, offsetMinutes }));
  const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, clientY, dataTransfer });
  Object.defineProperties(dropEvent, { dataTransfer: { value: dataTransfer }, clientY: { value: clientY } });
  zone.dispatchEvent(dropEvent);
  await flushPromises();
}

function timeGridColumn(isoDate: string): HTMLElement {
  const column = query(`${SELECTORS.TIME_GRID_COLUMN}[data-date="${isoDate}"]`);
  vi.spyOn(column, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 0, COLUMN_HEIGHT));
  return column;
}

function pillsOf(eventKey: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`${SELECTORS.EVENT}[data-event-key="${eventKey}"]`)];
}

async function chooseScope(selector: string): Promise<void> {
  await click(query(`#${ELEMENT_IDS.SCOPE_OVERLAY} ${selector}`));
}

function titleText(): { main: string | null; year: string | null } {
  return { main: requireById(ELEMENT_IDS.MONTH_NAME).textContent, year: requireById(ELEMENT_IDS.YEAR_LABEL).textContent };
}

function isHidden(id: string): boolean {
  return requireById(id).hasAttribute(HIDDEN_ATTRIBUTE);
}

function lastRequestedRange(): unknown {
  return api.getEvents.mock.lastCall?.[0];
}

describe('CalendarApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mountIndexDocument();
    vi.mocked(geocodeCity).mockResolvedValue(WEATHER_LOCATION);
    vi.mocked(fetchCurrentWeather).mockResolvedValue(CURRENT_WEATHER);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('start', () => {
    it('renders the month view from the stored settings', async () => {
      await startApp();
      expect(api.getSettings).toHaveBeenCalledOnce();
      expect(titleText()).toEqual({ main: TITLES.SEPTEMBER, year: TITLES.YEAR });
      expect(viewButton(VIEW_MODES.MONTH).classList.contains(ACTIVE_VIEW_CLASS)).toBe(true);
      expect(viewButton(VIEW_MODES.WEEK).classList.contains(ACTIVE_VIEW_CLASS)).toBe(false);
      expect(requireById(ELEMENT_IDS.CALENDAR).querySelector(SELECTORS.MONTH_VIEW)).not.toBeNull();
      expect(lastRequestedRange()).toEqual(RANGES.SEPTEMBER_GRID);
    });

    it('renders the week view with seven columns when stored as view mode', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      expect(titleText()).toEqual({ main: TITLES.CURRENT_WEEK, year: TITLES.YEAR });
      expect(viewButton(VIEW_MODES.WEEK).classList.contains(ACTIVE_VIEW_CLASS)).toBe(true);
      expect(requireById(ELEMENT_IDS.CALENDAR).querySelector(SELECTORS.TIME_GRID)).not.toBeNull();
      expect(document.querySelectorAll(SELECTORS.TIME_GRID_COLUMN)).toHaveLength(7);
      expect(lastRequestedRange()).toEqual(RANGES.CURRENT_WEEK);
    });

    it('renders a single column in the day view', async () => {
      await startApp({ viewMode: VIEW_MODES.DAY });
      expect(titleText()).toEqual({ main: TITLES.TODAY, year: TITLES.YEAR });
      expect(document.querySelectorAll(SELECTORS.TIME_GRID_COLUMN)).toHaveLength(1);
      expect(lastRequestedRange()).toEqual(RANGES.TODAY);
    });

    it('stores the resolved weather location when a city is configured', async () => {
      await startApp({ weatherCity: WEATHER_CITY });
      expect(geocodeCity).toHaveBeenCalledWith(WEATHER_CITY);
      expect(api.updateSettings).toHaveBeenCalledWith({ weatherLocation: WEATHER_LOCATION });
    });
  });

  describe('navigation', () => {
    it('moves to the next and previous period', async () => {
      await startApp();
      await click(requireById(ELEMENT_IDS.NEXT));
      expect(titleText().main).toBe(TITLES.OCTOBER);
      await click(requireById(ELEMENT_IDS.PREVIOUS));
      await click(requireById(ELEMENT_IDS.PREVIOUS));
      expect(titleText().main).toBe(TITLES.AUGUST);
    });

    it('jumps forward to today from a past period', async () => {
      await startApp();
      await click(requireById(ELEMENT_IDS.PREVIOUS));
      await click(requireById(ELEMENT_IDS.TODAY));
      expect(titleText().main).toBe(TITLES.SEPTEMBER);
      expect(lastRequestedRange()).toEqual(RANGES.SEPTEMBER_GRID);
    });

    it('jumps backward to today from a future period', async () => {
      await startApp();
      await click(requireById(ELEMENT_IDS.NEXT));
      await click(requireById(ELEMENT_IDS.TODAY));
      expect(titleText().main).toBe(TITLES.SEPTEMBER);
    });

    it('keeps the mounted view when rendering the same view again', async () => {
      await startApp();
      const calendar = requireById(ELEMENT_IDS.CALENDAR);
      const mountedView = calendar.firstElementChild;
      const replaceSpy = vi.spyOn(calendar, 'replaceChildren');
      await click(requireById(ELEMENT_IDS.NEXT));
      expect(replaceSpy).not.toHaveBeenCalled();
      expect(calendar.firstElementChild).toBe(mountedView);
    });
  });

  describe('view switcher', () => {
    it('switches the view, persists it and keeps today in sight', async () => {
      await startApp();
      await click(viewButton(VIEW_MODES.WEEK));
      expect(api.updateSettings).toHaveBeenCalledWith({ viewMode: VIEW_MODES.WEEK });
      expect(titleText().main).toBe(TITLES.CURRENT_WEEK);
      expect(viewButton(VIEW_MODES.WEEK).classList.contains(ACTIVE_VIEW_CLASS)).toBe(true);
      expect(requireById(ELEMENT_IDS.CALENDAR).querySelector(SELECTORS.TIME_GRID)).not.toBeNull();
    });

    it('ignores clicks on the already active view', async () => {
      await startApp();
      await click(viewButton(VIEW_MODES.MONTH));
      expect(api.updateSettings).not.toHaveBeenCalled();
      expect(api.getEvents).toHaveBeenCalledOnce();
    });

    it('anchors to the period start when the period does not contain today', async () => {
      await startApp();
      await click(requireById(ELEMENT_IDS.NEXT));
      await click(requireById(ELEMENT_IDS.NEXT));
      await click(viewButton(VIEW_MODES.WEEK));
      expect(titleText().main).toBe(TITLES.NOVEMBER_FIRST_WEEK);
    });
  });

  describe('settings dialog', () => {
    it('opens the settings dialog', async () => {
      await startApp();
      await click(requireById(ELEMENT_IDS.SETTINGS_BUTTON));
      expect(isHidden(ELEMENT_IDS.SETTINGS_OVERLAY)).toBe(false);
    });

    it('saves unchanged city settings without reconfiguring the weather', async () => {
      await startApp();
      await click(requireById(ELEMENT_IDS.SETTINGS_BUTTON));
      await submit(query(SELECTORS.SETTINGS_FORM));
      expect(api.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ weatherCity: DEFAULT_SETTINGS.weatherCity }));
      expect(isHidden(ELEMENT_IDS.SETTINGS_OVERLAY)).toBe(true);
      expect(titleText().main).toBe(TITLES.SEPTEMBER);
      expect(geocodeCity).not.toHaveBeenCalled();
    });

    it('reconfigures the weather when the city changes', async () => {
      await startApp();
      await click(requireById(ELEMENT_IDS.SETTINGS_BUTTON));
      query<HTMLInputElement>(SELECTORS.SETTINGS_CITY).value = WEATHER_CITY;
      await submit(query(SELECTORS.SETTINGS_FORM));
      expect(api.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ weatherCity: WEATHER_CITY }));
      expect(geocodeCity).toHaveBeenCalledWith(WEATHER_CITY);
      expect(api.updateSettings).toHaveBeenCalledWith({ weatherLocation: WEATHER_LOCATION });
    });
  });

  describe('event dialog', () => {
    it('opens for a day on double click in the month view', async () => {
      await startApp();
      dayCell(TODAY_ISO).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(false);
      expect(query(SELECTORS.DIALOG_DATE).textContent).toBe(TITLES.LONG_TODAY);
    });

    it('opens with the pointer time on double click in the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK });
      const column = timeGridColumn(TODAY_ISO);
      column.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, clientY: SLOT_POINTER_Y }));
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(false);
      expect(query<HTMLInputElement>(SELECTORS.DIALOG_TIME).value).toBe(SLOT_TIME);
    });

    it('does not save an event without title', async () => {
      await startApp();
      dayCell(TODAY_ISO).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await submit(query(SELECTORS.DIALOG_FORM));
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(false);
    });

    it('saves an event with title, closes the dialog and reloads', async () => {
      await startApp();
      dayCell(TODAY_ISO).dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      query<HTMLInputElement>(SELECTORS.DIALOG_TITLE).value = EVENT_TITLE;
      await submit(query(SELECTORS.DIALOG_FORM));
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ title: EVENT_TITLE, date: TODAY_ISO }));
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(true);
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('opens an existing event for editing and deletes it', async () => {
      await startApp({}, [STORED_EVENT]);
      await click(query(SELECTORS.EVENT));
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(false);
      expect(query(SELECTORS.DIALOG_HEADING).textContent).toBe(TITLES.EDIT_DIALOG);
      expect(query<HTMLInputElement>(SELECTORS.DIALOG_TITLE).value).toBe(EVENT_TITLE);

      await click(query(SELECTORS.DIALOG_DELETE));
      expect(api.deleteEvent).toHaveBeenCalledWith(EVENT_ID);
      expect(isHidden(ELEMENT_IDS.SCOPE_OVERLAY)).toBe(true);
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(true);
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('opens an existing event from the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK }, [STORED_EVENT]);
      await click(query(SELECTORS.EVENT_BLOCK));
      expect(query(SELECTORS.DIALOG_HEADING).textContent).toBe(TITLES.EDIT_DIALOG);
    });

    it('opens an all day event from the all day row of the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK }, [TRIP_EVENT]);
      await click(query(`${SELECTORS.TIME_GRID_ALL_DAY_CELL} ${SELECTORS.EVENT}`));
      expect(query(SELECTORS.DIALOG_HEADING).textContent).toBe(TITLES.EDIT_DIALOG);
    });

    it('saves only the edited occurrence of a series when chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      await click(query(SELECTORS.EVENT));
      await submit(query(SELECTORS.DIALOG_FORM));
      expect(isHidden(ELEMENT_IDS.SCOPE_OVERLAY)).toBe(false);

      await chooseScope(SELECTORS.SCOPE_OCCURRENCE);
      expect(api.saveOccurrence).toHaveBeenCalledWith(expect.objectContaining({ id: SERIES_ID, occurrenceDate: TODAY_ISO }));
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(isHidden(ELEMENT_IDS.SCOPE_OVERLAY)).toBe(true);
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(true);
    });

    it('saves the whole series when chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      await click(query(SELECTORS.EVENT));
      await submit(query(SELECTORS.DIALOG_FORM));
      await chooseScope(SELECTORS.SCOPE_SERIES);
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: SERIES_ID, recurrence: WEEKLY_RECURRENCE }));
      expect(api.saveOccurrence).not.toHaveBeenCalled();
    });

    it('keeps the dialog open when the scope prompt is cancelled', async () => {
      await startApp({}, [RECURRING_EVENT]);
      await click(query(SELECTORS.EVENT));
      await submit(query(SELECTORS.DIALOG_FORM));
      await chooseScope(SELECTORS.SCOPE_CANCEL);
      expect(api.saveEvent).not.toHaveBeenCalled();
      expect(api.saveOccurrence).not.toHaveBeenCalled();
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(false);
      expect(api.getEvents).toHaveBeenCalledOnce();
    });

    it('deletes only the chosen occurrence of a series', async () => {
      await startApp({}, [RECURRING_EVENT]);
      await click(query(SELECTORS.EVENT));
      await click(query(SELECTORS.DIALOG_DELETE));
      await chooseScope(SELECTORS.SCOPE_OCCURRENCE);
      expect(api.deleteOccurrence).toHaveBeenCalledWith({ id: SERIES_ID, occurrenceDate: TODAY_ISO });
      expect(api.deleteEvent).not.toHaveBeenCalled();
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(true);
    });

    it('ignores clicks on events that are not loaded', async () => {
      await startApp({}, [STORED_EVENT]);
      const pill = query(SELECTORS.EVENT);
      pill.dataset.eventKey = UNKNOWN_EVENT_KEY;
      await click(pill);
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(true);
    });
  });

  describe('multi day events', () => {
    it('renders a pill on every covered day of the month view', async () => {
      await startApp({}, [TRIP_EVENT]);
      expect(pillsOf(TRIP_KEY).map((pill) => pill.closest<HTMLElement>('.day')?.dataset.date)).toEqual([TODAY_ISO, TRIP_MIDDLE_ISO, TRIP_END_ISO]);
    });

    it('renders all day events in the all day row of the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK }, [TRIP_EVENT]);
      const cellDates = pillsOf(TRIP_KEY).map((pill) => pill.closest<HTMLElement>(SELECTORS.TIME_GRID_ALL_DAY_CELL)?.dataset.date);
      expect(cellDates).toEqual([TODAY_ISO, TRIP_MIDDLE_ISO, TRIP_END_ISO]);
    });
  });

  describe('drag and drop', () => {
    it('moves a dropped event to the target day', async () => {
      await startApp({}, [STORED_EVENT]);
      await dropOn(dayCell(DROP_TARGET_ISO), EVENT_KEY, NO_DAY_OFFSET, KEEP_TIME);
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_ID, occurrenceDate: TODAY_ISO, date: DROP_TARGET_ISO }));
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('moves a multi day event dropped by a later day so that day lands on the target', async () => {
      await startApp({}, [TRIP_EVENT]);
      await dropOn(dayCell(DROP_TARGET_ISO), TRIP_KEY, SECOND_DAY_OFFSET, KEEP_TIME);
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: TRIP_ID, date: TRIP_SHIFTED_START_ISO, endDate: TRIP_SHIFTED_END_ISO }));
    });

    it('moves a dropped event to the target slot in the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK }, [STORED_EVENT]);
      await dropOn(timeGridColumn(DROP_TARGET_ISO), EVENT_KEY, NO_DAY_OFFSET, GRAB_OFFSET_MINUTES, SLOT_POINTER_Y);
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_ID, date: DROP_TARGET_ISO, time: SLOT_TIME }));
    });

    it('moves an event dropped on the all day row of the week view to that date only', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK }, [STORED_EVENT]);
      await dropOn(query(`${SELECTORS.TIME_GRID_ALL_DAY_CELL}[data-date="${DROP_TARGET_ISO}"]`), EVENT_KEY, NO_DAY_OFFSET, KEEP_TIME);
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_ID, date: DROP_TARGET_ISO, time: STORED_EVENT.time }));
    });

    it('moves only the dropped occurrence of a series when chosen', async () => {
      await startApp({}, [RECURRING_EVENT]);
      await dropOn(dayCell(DROP_TARGET_ISO), toEventKey(RECURRING_EVENT), NO_DAY_OFFSET, KEEP_TIME);
      await chooseScope(SELECTORS.SCOPE_OCCURRENCE);
      expect(api.saveOccurrence).toHaveBeenCalledWith(expect.objectContaining({ id: SERIES_ID, occurrenceDate: TODAY_ISO, date: DROP_TARGET_ISO }));
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('ignores drops of unknown events', async () => {
      await startApp({}, [STORED_EVENT]);
      await dropOn(dayCell(DROP_TARGET_ISO), UNKNOWN_EVENT_KEY);
      expect(api.saveEvent).not.toHaveBeenCalled();
    });
  });
});
