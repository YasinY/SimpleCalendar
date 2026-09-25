import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { closeCalendar, DEFAULT_LAUNCH_OPTIONS, expect, launchCalendar, test } from './support/calendarFixture';
import {
  createUserData,
  launchElectronInUserData,
  launchInUserData,
  quitAndWaitForExit,
  removeUserData
} from './support/userDataLaunch';
import {
  DATABASE_FILE_NAME,
  LEGACY_EVENTS_FILE_NAME,
  LEGACY_EVENTS_MIGRATED_SUFFIX,
  SETTINGS_FILE_NAME
} from '@main/constants';
import { DEFAULT_SETTINGS } from '@shared/settingsDefaults';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { EventInput } from '@shared/eventInput';
import type { OccurrenceRef } from '@shared/occurrenceRef';
import type { Recurrence } from '@shared/recurrence';
import type { Settings } from '@shared/settings';

const EVENT_DATE = '2031-05-14';
const EVENT_END_DATE = '2031-05-16';
const EARLIER_DATE = '2031-05-01';
const EARLIEST_DATE = '';
const LATEST_DATE = '9999-12-31';
const START_TIME = '10:00';
const LATER_TIME = '11:30';
const EARLIER_TIME = '09:00';
const EVENT_COLOR = '#ff9500';
const REMINDER_MINUTES = 15;
const FULL_EVENT_ID = 'legacy-full';
const UNKNOWN_EVENT_ID = 'unknown-event-id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CORRUPT_JSON = '{ not json';
const NON_ARRAY_JSON = '{}';
const NON_OBJECT_JSON = '[1,2]';
const CORRUPT_DATABASE = 'this is not a sqlite database';
const HOLIDAY_REGION = 'BY';
const NUMERIC_TITLE = 42;
const EMPTY_TEXT = '';
const UNKNOWN_SETTING_KEY = 'unknownSetting';
const INVALID_FREQUENCY = 'hourly';
const FRACTIONAL_INTERVAL = 2.5;
const INVALID_INTERVAL = 0;

const SERIES_DATES = {
  MONDAY: '2031-05-05',
  WEDNESDAY: '2031-05-07',
  NEXT_MONDAY: '2031-05-12',
  NEXT_WEDNESDAY: '2031-05-14',
  THIRD_MONDAY: '2031-05-19',
  THIRD_WEDNESDAY: '2031-05-21',
  RANGE_END: '2031-05-25'
} as const;

const WEEKLY: Recurrence = { frequency: 'weekly', interval: 1, until: null };

const WEEKLY_SERIES: EventInput = { date: SERIES_DATES.MONDAY, time: START_TIME, title: 'Wochentermin', recurrence: WEEKLY };

const MONTH_END_SERIES = {
  id: 'legacy-month-end',
  date: '2031-01-31',
  endDate: '2031-02-01',
  time: START_TIME,
  title: 'Monatsabschluss',
  recurrence: { frequency: 'monthly', interval: 1, until: '2031-04-30' },
  notified: true
};

const MONTH_END_OCCURRENCES = [
  { date: '2031-01-31', endDate: '2031-02-01', notified: true },
  { date: '2031-02-28', endDate: '2031-03-01', notified: false },
  { date: '2031-03-31', endDate: '2031-04-01', notified: false },
  { date: '2031-04-30', endDate: '2031-05-01', notified: false }
];

const INVALID_SERIES = {
  id: 'legacy-invalid-series',
  date: EVENT_DATE,
  endDate: EARLIER_DATE,
  time: START_TIME,
  title: 'Ohne gültige Serie',
  recurrence: { frequency: INVALID_FREQUENCY, interval: FRACTIONAL_INTERVAL }
};

const LEAP_DAY_SERIES = { from: '2032-01-01', to: '2034-12-31', dates: ['2032-02-29', '2033-02-28', '2034-02-28'] } as const;

const FULL_LEGACY_EVENT: CalendarEvent = {
  id: FULL_EVENT_ID,
  date: EVENT_DATE,
  time: START_TIME,
  endTime: LATER_TIME,
  allDay: true,
  title: '  Import mit Leerzeichen  ',
  notes: 'Übernommene Notiz',
  color: EVENT_COLOR,
  reminderMinutes: REMINDER_MINUTES,
  endDate: EVENT_END_DATE,
  recurrence: null,
  notified: true
};

function getAllEvents(page: Page): Promise<CalendarEvent[]> {
  return page.evaluate((range) => window.calendarApi.getEvents(range), { from: EARLIEST_DATE, to: LATEST_DATE });
}

function saveEvent(page: Page, input: EventInput): Promise<CalendarEvent> {
  return page.evaluate((payload) => window.calendarApi.saveEvent(payload), input);
}

function getEventsBetween(page: Page, from: string, to: string): Promise<CalendarEvent[]> {
  return page.evaluate((range) => window.calendarApi.getEvents(range), { from, to });
}

function saveOccurrence(page: Page, input: EventInput): Promise<CalendarEvent> {
  return page.evaluate((payload) => window.calendarApi.saveOccurrence(payload), input);
}

function deleteOccurrence(page: Page, ref: OccurrenceRef): Promise<boolean> {
  return page.evaluate((occurrence) => window.calendarApi.deleteOccurrence(occurrence), ref);
}

async function seriesDates(page: Page, id: string): Promise<string[]> {
  const events = await getEventsBetween(page, SERIES_DATES.MONDAY, SERIES_DATES.RANGE_END);
  return events.filter((event) => event.id === id).map((event) => event.date);
}

function saveUntypedEvent(page: Page, input: Record<string, unknown>): Promise<CalendarEvent> {
  return saveEvent(page, input as unknown as EventInput);
}

function updateUntypedSettings(page: Page, patch: unknown): Promise<Settings> {
  return page.evaluate((value) => window.calendarApi.updateSettings(value as Partial<Settings>), patch);
}

function getSettings(page: Page): Promise<Settings> {
  return page.evaluate(() => window.calendarApi.getSettings());
}

async function withUserDataFiles(files: Record<string, string>, run: (page: Page, userData: string) => Promise<void>): Promise<void> {
  const running = await launchInUserData(createUserData(files));
  await run(running.page, running.userData);
  await closeCalendar(running);
}

test.describe('legacy events import', () => {
  test.use({
    calendarLaunch: {
      ...DEFAULT_LAUNCH_OPTIONS,
      legacyEvents: [FULL_LEGACY_EVENT, { id: EMPTY_TEXT, date: EVENT_DATE, title: NUMERIC_TITLE, color: EMPTY_TEXT, reminderMinutes: String(REMINDER_MINUTES) }, {}]
    }
  });

  test('imports and normalizes legacy events and renames the legacy file', async ({ calendar: { page, userData } }) => {
    const events = await getAllEvents(page);
    const legacyPath = path.join(userData, LEGACY_EVENTS_FILE_NAME);

    expect(events).toHaveLength(2);
    expect(events.find((event) => event.id === FULL_EVENT_ID)).toEqual({ ...FULL_LEGACY_EVENT, title: FULL_LEGACY_EVENT.title.trim() });
    const generated = events.filter((event) => event.id !== FULL_EVENT_ID);
    for (const event of generated) {
      expect(event.id).toMatch(UUID_PATTERN);
      expect(event).toMatchObject({ endDate: null, time: EMPTY_TEXT, endTime: null, allDay: false, title: EMPTY_TEXT, notes: EMPTY_TEXT, color: null, reminderMinutes: null, recurrence: null, notified: false });
    }
    expect(generated.map((event) => event.date)).toEqual([EVENT_DATE]);
    expect(existsSync(legacyPath)).toBe(false);
    expect(existsSync(legacyPath + LEGACY_EVENTS_MIGRATED_SUFFIX)).toBe(true);
  });
});

test.describe('legacy series import', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, legacyEvents: [MONTH_END_SERIES, INVALID_SERIES] } });

  test('expands imported series, keeps the notified occurrence and drops invalid recurrences', async ({ calendar: { page } }) => {
    const events = await getAllEvents(page);
    const occurrences = events.filter((event) => event.id === MONTH_END_SERIES.id);

    expect(occurrences.map(({ date, endDate, notified }) => ({ date, endDate, notified }))).toEqual(MONTH_END_OCCURRENCES);
    expect(occurrences[0].recurrence).toEqual(MONTH_END_SERIES.recurrence);
    expect(events.find((event) => event.id === INVALID_SERIES.id)).toMatchObject({ endDate: null, recurrence: null });
  });
});

for (const [description, content] of [['not an array', NON_ARRAY_JSON], ['corrupt', CORRUPT_JSON]]) {
  test('keeps a legacy events file that is ' + description + ' without importing it', async () => {
    await withUserDataFiles({ [LEGACY_EVENTS_FILE_NAME]: content }, async (page, userData) => {
      expect(await getAllEvents(page)).toEqual([]);
      expect(existsSync(path.join(userData, LEGACY_EVENTS_FILE_NAME))).toBe(true);
      expect(existsSync(path.join(userData, LEGACY_EVENTS_FILE_NAME + LEGACY_EVENTS_MIGRATED_SUFFIX))).toBe(false);
    });
  });
}

test('normalizes end time, text, color and reminder of saved events', async ({ calendar: { page } }) => {
  const base = { date: EVENT_DATE, time: START_TIME, title: 'Normalisiert' };

  expect(await saveEvent(page, { ...base, endTime: LATER_TIME, allDay: true, notes: ' Notiz ', color: EVENT_COLOR, reminderMinutes: REMINDER_MINUTES }))
    .toMatchObject({ endTime: LATER_TIME, allDay: true, notes: 'Notiz', color: EVENT_COLOR, reminderMinutes: REMINDER_MINUTES, notified: false });
  expect(await saveEvent(page, { ...base, endTime: EARLIER_TIME, color: EMPTY_TEXT }))
    .toMatchObject({ endTime: null, allDay: false, notes: EMPTY_TEXT, color: null, reminderMinutes: null });
  expect(await saveEvent(page, { ...base, endTime: EMPTY_TEXT, reminderMinutes: Number.NaN })).toMatchObject({ endTime: null, reminderMinutes: null });
  expect(await saveUntypedEvent(page, { ...base, title: NUMERIC_TITLE, reminderMinutes: String(REMINDER_MINUTES) }))
    .toMatchObject({ endTime: null, title: EMPTY_TEXT, reminderMinutes: null });
});

test('normalizes end date and recurrence of saved events', async ({ calendar: { page } }) => {
  const base = { date: EVENT_DATE, time: START_TIME, title: 'Serie normalisiert' };

  expect(await saveEvent(page, { ...base, endDate: EVENT_END_DATE, endTime: EARLIER_TIME })).toMatchObject({ endDate: EVENT_END_DATE, endTime: EARLIER_TIME });
  expect(await saveEvent(page, { ...base, endDate: EARLIER_DATE })).toMatchObject({ endDate: null });
  expect(await saveEvent(page, { ...base, endDate: EMPTY_TEXT })).toMatchObject({ endDate: null });
  expect(await saveUntypedEvent(page, { ...base, recurrence: { frequency: INVALID_FREQUENCY, interval: 1 } })).toMatchObject({ recurrence: null });
  expect(await saveUntypedEvent(page, { ...base, recurrence: WEEKLY.frequency })).toMatchObject({ recurrence: null });
  expect(await saveUntypedEvent(page, { ...base, recurrence: { frequency: WEEKLY.frequency, interval: FRACTIONAL_INTERVAL } }))
    .toMatchObject({ recurrence: { frequency: WEEKLY.frequency, interval: 1, until: null } });

  const leapDay = await saveUntypedEvent(page, { ...base, date: LEAP_DAY_SERIES.dates[0], recurrence: { frequency: 'yearly', interval: INVALID_INTERVAL, until: EMPTY_TEXT } });
  expect(leapDay.recurrence).toEqual({ frequency: 'yearly', interval: 1, until: null });
  const leapDayOccurrences = await getEventsBetween(page, LEAP_DAY_SERIES.from, LEAP_DAY_SERIES.to);
  expect(leapDayOccurrences.filter((event) => event.id === leapDay.id).map((event) => event.date)).toEqual(LEAP_DAY_SERIES.dates);
});

test('returns multi day events that overlap the start of the range', async ({ calendar: { page } }) => {
  const saved = await saveEvent(page, { date: EARLIER_DATE, endDate: EVENT_DATE, time: START_TIME, title: 'Lange Reise' });
  expect(await getEventsBetween(page, EVENT_DATE, EVENT_END_DATE)).toEqual([saved]);
  expect(await getEventsBetween(page, EVENT_END_DATE, EVENT_END_DATE)).toEqual([]);
});

test('shifts the whole series when an occurrence is saved with a new date', async ({ calendar: { page } }) => {
  const series = await saveEvent(page, WEEKLY_SERIES);
  await saveEvent(page, { ...WEEKLY_SERIES, id: series.id, occurrenceDate: SERIES_DATES.NEXT_MONDAY, date: SERIES_DATES.NEXT_WEDNESDAY });

  expect(await seriesDates(page, series.id)).toEqual([SERIES_DATES.WEDNESDAY, SERIES_DATES.NEXT_WEDNESDAY, SERIES_DATES.THIRD_WEDNESDAY]);
});

test('moves a single event to the new date even with an occurrence date', async ({ calendar: { page } }) => {
  const single = await saveEvent(page, { date: SERIES_DATES.MONDAY, time: START_TIME, title: 'Einzeln' });
  const moved = await saveEvent(page, { ...single, occurrenceDate: SERIES_DATES.MONDAY, date: SERIES_DATES.WEDNESDAY });
  expect(moved).toMatchObject({ id: single.id, date: SERIES_DATES.WEDNESDAY });
});

test('detaches a saved occurrence from its series', async ({ calendar: { page } }) => {
  const series = await saveEvent(page, WEEKLY_SERIES);
  const detached = await saveOccurrence(page, {
    ...WEEKLY_SERIES,
    id: series.id,
    occurrenceDate: SERIES_DATES.NEXT_MONDAY,
    date: SERIES_DATES.NEXT_WEDNESDAY,
    title: 'Einmal verschoben'
  });

  expect(detached.id).not.toBe(series.id);
  expect(detached).toMatchObject({ date: SERIES_DATES.NEXT_WEDNESDAY, title: 'Einmal verschoben', recurrence: null });
  expect(await seriesDates(page, series.id)).toEqual([SERIES_DATES.MONDAY, SERIES_DATES.THIRD_MONDAY]);
  expect(await seriesDates(page, detached.id)).toEqual([SERIES_DATES.NEXT_WEDNESDAY]);
});

test('saves an occurrence of a single event or without occurrence date like a regular event', async ({ calendar: { page } }) => {
  const single = await saveEvent(page, { date: SERIES_DATES.MONDAY, time: START_TIME, title: 'Einzeln' });
  const updated = await saveOccurrence(page, { ...single, occurrenceDate: SERIES_DATES.MONDAY, title: 'Geändert' });
  const series = await saveEvent(page, WEEKLY_SERIES);
  const renamedSeries = await saveOccurrence(page, { ...WEEKLY_SERIES, id: series.id, title: 'Serie geändert' });

  expect(updated).toMatchObject({ id: single.id, title: 'Geändert', recurrence: null });
  expect(renamedSeries).toMatchObject({ id: series.id, title: 'Serie geändert', recurrence: WEEKLY });
  expect(await seriesDates(page, series.id)).toEqual([SERIES_DATES.MONDAY, SERIES_DATES.NEXT_MONDAY, SERIES_DATES.THIRD_MONDAY]);
});

test('skips deleted occurrences and removes the exceptions with the series', async ({ calendar: { page } }) => {
  const series = await saveEvent(page, WEEKLY_SERIES);
  const skippedOccurrence = { id: series.id, occurrenceDate: SERIES_DATES.NEXT_MONDAY };

  expect(await deleteOccurrence(page, skippedOccurrence)).toBe(true);
  expect(await deleteOccurrence(page, skippedOccurrence)).toBe(true);
  expect(await deleteOccurrence(page, { id: series.id, occurrenceDate: SERIES_DATES.THIRD_MONDAY })).toBe(true);
  expect(await seriesDates(page, series.id)).toEqual([SERIES_DATES.MONDAY]);

  await saveEvent(page, { ...WEEKLY_SERIES, id: series.id, recurrence: null });
  await saveEvent(page, { ...WEEKLY_SERIES, id: series.id });
  expect(await seriesDates(page, series.id)).toEqual([SERIES_DATES.MONDAY, SERIES_DATES.NEXT_MONDAY, SERIES_DATES.THIRD_MONDAY]);

  expect(await deleteOccurrence(page, skippedOccurrence)).toBe(true);
  expect(await page.evaluate((id) => window.calendarApi.deleteEvent(id), series.id)).toBe(true);
  expect(await getAllEvents(page)).toEqual([]);
});

test('deletes a single event through an occurrence and reports unknown ids', async ({ calendar: { page } }) => {
  const single = await saveEvent(page, { date: EVENT_DATE, time: START_TIME, title: 'Einzeln' });
  expect(await deleteOccurrence(page, { id: single.id, occurrenceDate: EVENT_DATE })).toBe(true);
  expect(await deleteOccurrence(page, { id: UNKNOWN_EVENT_ID, occurrenceDate: EVENT_DATE })).toBe(false);
  expect(await getAllEvents(page)).toEqual([]);
});

test('updates an existing event by id and creates a new one for an unknown id', async ({ calendar: { page } }) => {
  const created = await saveEvent(page, { date: EVENT_DATE, time: START_TIME, title: 'Original' });
  const updated = await saveEvent(page, { id: created.id, date: EVENT_DATE, time: LATER_TIME, title: 'Geändert' });
  const fromUnknownId = await saveEvent(page, { id: UNKNOWN_EVENT_ID, date: EVENT_DATE, time: START_TIME, title: 'Neu' });

  expect(updated).toMatchObject({ id: created.id, time: LATER_TIME, title: 'Geändert' });
  expect(fromUnknownId.id).not.toBe(UNKNOWN_EVENT_ID);
  expect(fromUnknownId.id).toMatch(UUID_PATTERN);
  expect((await getAllEvents(page)).map((event) => event.title)).toEqual(['Neu', 'Geändert']);
});

test('reports whether deleting an event removed it', async ({ calendar: { page } }) => {
  const created = await saveEvent(page, { date: EVENT_DATE, time: START_TIME, title: 'Zu löschen' });
  expect(await page.evaluate((id) => window.calendarApi.deleteEvent(id), created.id)).toBe(true);
  expect(await page.evaluate((id) => window.calendarApi.deleteEvent(id), UNKNOWN_EVENT_ID)).toBe(false);
  expect(await getAllEvents(page)).toEqual([]);
});

for (const [description, content] of [['corrupt', CORRUPT_JSON], ['not an object', NON_OBJECT_JSON]]) {
  test('falls back to default settings when the settings file is ' + description, async () => {
    await withUserDataFiles({ [SETTINGS_FILE_NAME]: content }, async (page) => {
      expect(await getSettings(page)).toEqual(DEFAULT_SETTINGS);
    });
  });
}

test('loads only known keys from the settings file', async () => {
  const stored = JSON.stringify({ holidayRegion: HOLIDAY_REGION, [UNKNOWN_SETTING_KEY]: true });
  await withUserDataFiles({ [SETTINGS_FILE_NAME]: stored }, async (page) => {
    expect(await getSettings(page)).toEqual({ ...DEFAULT_SETTINGS, holidayRegion: HOLIDAY_REGION });
  });
});

test('ignores invalid settings patches and unknown keys', async ({ calendar: { page } }) => {
  for (const invalidPatch of [null, NUMERIC_TITLE, [HOLIDAY_REGION]]) {
    expect(await updateUntypedSettings(page, invalidPatch)).toEqual(DEFAULT_SETTINGS);
  }
  expect(await updateUntypedSettings(page, { holidayRegion: HOLIDAY_REGION, [UNKNOWN_SETTING_KEY]: true }))
    .toEqual({ ...DEFAULT_SETTINGS, holidayRegion: HOLIDAY_REGION });
});

test('persists settings and events across restarts', async () => {
  const first = await launchCalendar(DEFAULT_LAUNCH_OPTIONS);
  await updateUntypedSettings(first.page, { holidayRegion: HOLIDAY_REGION });
  const saved = await saveEvent(first.page, { date: EVENT_DATE, time: START_TIME, title: 'Bleibt erhalten' });
  await quitAndWaitForExit(first.app);

  const second = await launchInUserData(first.userData);
  expect(await getSettings(second.page)).toEqual({ ...DEFAULT_SETTINGS, holidayRegion: HOLIDAY_REGION });
  expect(await getAllEvents(second.page)).toEqual([saved]);
  await closeCalendar(second);
});

test('closes and rethrows when the database file cannot be opened', async () => {
  const userData = createUserData({ [DATABASE_FILE_NAME]: CORRUPT_DATABASE });
  const app = await launchElectronInUserData(userData);
  await expect.poll(() => app.evaluate(({ app: electronApp }) => electronApp.isReady())).toBe(true);
  expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length)).toBe(0);
  await app.evaluate(() => process.on('uncaughtException', () => undefined));
  await quitAndWaitForExit(app);
  removeUserData(userData);
});
