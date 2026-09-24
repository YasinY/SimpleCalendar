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
} from '../../src/main/constants';
import { DEFAULT_SETTINGS } from '../../src/shared/settingsDefaults';
import type { CalendarEvent } from '../../src/shared/calendarEvent';
import type { EventInput } from '../../src/shared/eventInput';
import type { Settings } from '../../src/shared/settings';

const EVENT_DATE = '2031-05-14';
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
  notified: true
};

function getAllEvents(page: Page): Promise<CalendarEvent[]> {
  return page.evaluate((range) => window.calendarApi.getEvents(range), { from: EARLIEST_DATE, to: LATEST_DATE });
}

function saveEvent(page: Page, input: EventInput): Promise<CalendarEvent> {
  return page.evaluate((payload) => window.calendarApi.saveEvent(payload), input);
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

    expect(events).toHaveLength(3);
    expect(events.find((event) => event.id === FULL_EVENT_ID)).toEqual({ ...FULL_LEGACY_EVENT, title: FULL_LEGACY_EVENT.title.trim() });
    const generated = events.filter((event) => event.id !== FULL_EVENT_ID);
    for (const event of generated) {
      expect(event.id).toMatch(UUID_PATTERN);
      expect(event).toMatchObject({ time: EMPTY_TEXT, endTime: null, allDay: false, title: EMPTY_TEXT, notes: EMPTY_TEXT, color: null, reminderMinutes: null, notified: false });
    }
    expect(generated.map((event) => event.date).sort()).toEqual([EMPTY_TEXT, EVENT_DATE]);
    expect(existsSync(legacyPath)).toBe(false);
    expect(existsSync(legacyPath + LEGACY_EVENTS_MIGRATED_SUFFIX)).toBe(true);
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
