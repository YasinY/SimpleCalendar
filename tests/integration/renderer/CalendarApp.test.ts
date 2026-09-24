import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createCalendarApp } from '../../../src/renderer/createCalendarApp';
import { fetchCurrentWeather, geocodeCity } from '../../../src/renderer/weather/weatherApi';
import { DEFAULT_SETTINGS } from '../../../src/shared/settingsDefaults';
import type { CalendarApi } from '../../../src/shared/calendarApi';
import type { CalendarEvent } from '../../../src/shared/calendarEvent';
import type { Settings } from '../../../src/shared/settings';
import type { WeatherLocation } from '../../../src/shared/weatherLocation';
import { createCalendarEvent } from '../../support/calendarEventFactory';
import { mountIndexDocument, requireById } from '../../support/indexDocument';

vi.mock('../../../src/renderer/weather/weatherApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/renderer/weather/weatherApi')>()),
  geocodeCity: vi.fn(),
  fetchCurrentWeather: vi.fn()
}));

type CalendarApiMock = { [Key in keyof CalendarApi]: Mock<CalendarApi[Key]> };

const NOW = new Date(2026, 8, 16, 12, 0);
const TODAY_ISO = '2026-09-16';
const DROP_TARGET_ISO = '2026-09-20';
const EVENT_ID = 'event-1';
const UNKNOWN_EVENT_ID = 'missing';
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
  SETTINGS_OVERLAY: 'settingsOverlay'
} as const;

const SELECTORS = {
  MONTH_VIEW: '.month-view',
  TIME_GRID: '.time-grid',
  TIME_GRID_COLUMN: '.time-grid__column',
  EVENT: '.event',
  SETTINGS_FORM: '[data-settings-form]',
  SETTINGS_CITY: '[data-settings-city]',
  DIALOG_FORM: '[data-dialog-form]',
  DIALOG_TITLE: '[data-dialog-title]',
  DIALOG_TIME: '[data-dialog-time]',
  DIALOG_DATE: '[data-dialog-date]',
  DIALOG_HEADING: '[data-dialog-heading]',
  DIALOG_DELETE: '[data-dialog-delete]'
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

function createApi(settings: Settings, events: CalendarEvent[]): CalendarApiMock {
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

async function flushPromises(): Promise<void> {
  for (let round = 0; round < FLUSH_ROUNDS; round += 1) {
    await vi.advanceTimersByTimeAsync(0);
  }
}

async function startApp(settingsOverrides: Partial<Settings> = {}, events: CalendarEvent[] = []): Promise<void> {
  api = createApi({ ...DEFAULT_SETTINGS, ...settingsOverrides }, events);
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

async function dropOn(zone: HTMLElement, eventId: string, clientY = 0): Promise<void> {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify({ eventId, offsetMinutes: 0 }));
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
      await startApp({}, [createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO, title: EVENT_TITLE })]);
      await click(query(SELECTORS.EVENT));
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(false);
      expect(query(SELECTORS.DIALOG_HEADING).textContent).toBe(TITLES.EDIT_DIALOG);
      expect(query<HTMLInputElement>(SELECTORS.DIALOG_TITLE).value).toBe(EVENT_TITLE);

      await click(query(SELECTORS.DIALOG_DELETE));
      expect(api.deleteEvent).toHaveBeenCalledWith(EVENT_ID);
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(true);
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('opens an existing event from the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK }, [createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO, title: EVENT_TITLE })]);
      await click(query(SELECTORS.EVENT));
      expect(query(SELECTORS.DIALOG_HEADING).textContent).toBe(TITLES.EDIT_DIALOG);
    });

    it('ignores clicks on events that are not loaded', async () => {
      await startApp({}, [createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO })]);
      const pill = query(SELECTORS.EVENT);
      pill.dataset.eventId = UNKNOWN_EVENT_ID;
      await click(pill);
      expect(isHidden(ELEMENT_IDS.DIALOG_OVERLAY)).toBe(true);
    });
  });

  describe('drag and drop', () => {
    it('moves a dropped event to the target day', async () => {
      await startApp({}, [createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO })]);
      await dropOn(dayCell(DROP_TARGET_ISO), EVENT_ID);
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_ID, date: DROP_TARGET_ISO }));
      expect(api.getEvents).toHaveBeenCalledTimes(2);
    });

    it('moves a dropped event to the target slot in the week view', async () => {
      await startApp({ viewMode: VIEW_MODES.WEEK }, [createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO })]);
      await dropOn(timeGridColumn(DROP_TARGET_ISO), EVENT_ID, SLOT_POINTER_Y);
      expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: EVENT_ID, date: DROP_TARGET_ISO, time: SLOT_TIME }));
    });

    it('ignores drops of unknown events', async () => {
      await startApp({}, [createCalendarEvent({ id: EVENT_ID, date: TODAY_ISO })]);
      await dropOn(dayCell(DROP_TARGET_ISO), UNKNOWN_EVENT_ID);
      expect(api.saveEvent).not.toHaveBeenCalled();
    });
  });
});
