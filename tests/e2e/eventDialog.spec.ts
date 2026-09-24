import type { Page } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import { openSettings, SETTINGS_SELECTORS } from './support/settingsDialogActions';
import type { CalendarEvent } from '../../src/shared/calendarEvent';

const ISO_DATE_LENGTH = 10;
const MILLISECONDS_PER_MINUTE = 60000;
const ESCAPE_KEY = 'Escape';
const TAB_KEY = 'Tab';
const BACKDROP_CORNER = { position: { x: 5, y: 200 } };

const SELECTORS = {
  TODAY: '.day--today',
  EVENT: '.event',
  EVENT_TITLE: '.event__title',
  EVENT_TIME: '.event__time',
  TIME_GRID_COLUMN: '.time-grid__column',
  WEEK_VIEW_BUTTON: '[data-view-mode="week"]',
  OVERLAY: '#dialogOverlay',
  FORM: '[data-dialog-form]',
  HEADING: '[data-dialog-heading]',
  DATE_LABEL: '[data-dialog-date]',
  TITLE: '[data-dialog-title]',
  TIME: '[data-dialog-time]',
  END_TIME: '[data-dialog-end-time]',
  ALL_DAY: '[data-dialog-all-day]',
  NOTES: '[data-dialog-notes]',
  REMINDER: '[data-dialog-reminder]',
  SUBMIT: '[data-dialog-submit]',
  DELETE: '[data-dialog-delete]',
  CANCEL: '[data-dialog-cancel]',
  TEAL_SWATCH: '.swatch--teal',
  DISCARD_OVERLAY: '#discardOverlay',
  DISCARD_KEEP: '[data-discard-keep]',
  DISCARD_CONFIRM: '[data-discard-confirm]'
} as const;

const COLOR_INPUT_SELECTOR = (colorId: string): string => '[data-dialog-colors] input[value="' + colorId + '"]';

const LABELS = {
  CREATE_TITLE: 'Neues Ereignis',
  EDIT_TITLE: 'Ereignis bearbeiten',
  CREATE_SUBMIT: 'Hinzufügen',
  EDIT_SUBMIT: 'Sichern',
  ALL_DAY: 'Ganztägig'
} as const;

const COLORS = { DEFAULT: 'blue', TEAL: 'teal', UNKNOWN: 'neon' } as const;
const COLOR_CLASS_PREFIX = 'event--color-';
const DEFAULT_TIME = '09:00';
const ALL_DAY_TIME = '00:00';
const NO_VALUE = '';
const TIME_PATTERN = /^\d{2}:\d{2}$/;

const REMINDERS = { NONE: '', QUARTER_HOUR: '15', HALF_HOUR: '30' } as const;

const NEW_EVENT = {
  RAW_TITLE: '  Teamrunde  ',
  TITLE: 'Teamrunde',
  TIME: '14:00',
  END_TIME: '15:30',
  TIME_RANGE: '14:00–15:30',
  NOTES: 'Raum 3, Agenda folgt'
} as const;

const ALL_DAY_TITLE = 'Betriebsausflug';
const IGNORED_END_TIME = '12:00';
const REVERSED_EVENT = { TITLE: 'Rückwärts', TIME: '15:00', END_TIME: '14:00' } as const;
const WHITESPACE_TITLE = '   ';
const DRAFT_TITLE = 'Entwurf';
const DRAFT_CITY = 'Entwurfsstadt';

const SEEDED_EVENTS = {
  UNKNOWN_COLOR: { id: 'seed-unknown-color', title: 'Neonfarbe', time: '08:00' },
  DETAILED: { id: 'seed-detailed', title: 'Zahnarzt', time: '10:00', endTime: '11:00', notes: 'Bonusheft mitnehmen', reminderMinutes: 30 },
  ALL_DAY: { id: 'seed-all-day', title: 'Urlaub' }
} as const;

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * MILLISECONDS_PER_MINUTE);
  return local.toISOString().slice(0, ISO_DATE_LENGTH);
}

function seededEvents(date: string): unknown[] {
  const { UNKNOWN_COLOR, DETAILED, ALL_DAY } = SEEDED_EVENTS;
  return [
    { ...UNKNOWN_COLOR, date, color: COLORS.UNKNOWN, reminderMinutes: null, notified: true },
    { ...DETAILED, date, color: COLORS.TEAL, notified: true },
    { ...ALL_DAY, date, time: ALL_DAY_TIME, allDay: true, notified: true }
  ];
}

async function openCreateDialog(page: Page): Promise<void> {
  await page.locator(SELECTORS.TODAY).dblclick();
  await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
}

function eventPill(page: Page, title: string) {
  return page.locator(SELECTORS.TODAY).locator(SELECTORS.EVENT, { hasText: title });
}

function eventsOfToday(page: Page): Promise<CalendarEvent[]> {
  const today = todayIso();
  return page.evaluate((date) => window.calendarApi.getEvents({ from: date, to: date }), today);
}

async function submitDialog(page: Page): Promise<void> {
  await page.locator(SELECTORS.SUBMIT).click();
}

test.describe('creating events', () => {
  test('creates an event with title, times, color, reminder and notes', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await expect(page.locator(SELECTORS.HEADING)).toHaveText(LABELS.CREATE_TITLE);
    await expect(page.locator(SELECTORS.SUBMIT)).toHaveText(LABELS.CREATE_SUBMIT);
    await expect(page.locator(SELECTORS.DATE_LABEL)).not.toBeEmpty();
    await expect(page.locator(SELECTORS.DELETE)).toBeHidden();
    await expect(page.locator(SELECTORS.TIME)).toHaveValue(DEFAULT_TIME);
    await expect(page.locator(SELECTORS.REMINDER)).toHaveValue(REMINDERS.NONE);
    await expect(page.locator(COLOR_INPUT_SELECTOR(COLORS.DEFAULT))).toBeChecked();

    await page.locator(SELECTORS.TITLE).fill(NEW_EVENT.RAW_TITLE);
    await page.locator(SELECTORS.TIME).fill(NEW_EVENT.TIME);
    await page.locator(SELECTORS.END_TIME).fill(NEW_EVENT.END_TIME);
    await page.locator(SELECTORS.TEAL_SWATCH).click();
    await page.locator(SELECTORS.REMINDER).selectOption(REMINDERS.QUARTER_HOUR);
    await page.locator(SELECTORS.NOTES).fill(NEW_EVENT.NOTES);
    await submitDialog(page);

    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
    const pill = eventPill(page, NEW_EVENT.TITLE);
    await expect(pill).toHaveClass(new RegExp(COLOR_CLASS_PREFIX + COLORS.TEAL));
    await expect(pill.locator(SELECTORS.EVENT_TITLE)).toHaveText(NEW_EVENT.TITLE);
    await expect(pill.locator(SELECTORS.EVENT_TIME)).toHaveText(NEW_EVENT.TIME_RANGE);
    await expect(pill).toHaveAttribute('title', new RegExp(NEW_EVENT.NOTES));

    await pill.click();
    await expect(page.locator(SELECTORS.HEADING)).toHaveText(LABELS.EDIT_TITLE);
    await expect(page.locator(SELECTORS.SUBMIT)).toHaveText(LABELS.EDIT_SUBMIT);
    await expect(page.locator(SELECTORS.DELETE)).toBeVisible();
    await expect(page.locator(SELECTORS.TITLE)).toHaveValue(NEW_EVENT.TITLE);
    await expect(page.locator(SELECTORS.TIME)).toHaveValue(NEW_EVENT.TIME);
    await expect(page.locator(SELECTORS.END_TIME)).toHaveValue(NEW_EVENT.END_TIME);
    await expect(page.locator(SELECTORS.REMINDER)).toHaveValue(REMINDERS.QUARTER_HOUR);
    await expect(page.locator(SELECTORS.NOTES)).toHaveValue(NEW_EVENT.NOTES);
    await expect(page.locator(COLOR_INPUT_SELECTOR(COLORS.TEAL))).toBeChecked();
  });

  test('all day disables the time fields and stores midnight without end time', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    const allDay = page.locator(SELECTORS.ALL_DAY);
    await page.locator(SELECTORS.TITLE).fill(ALL_DAY_TITLE);
    await page.locator(SELECTORS.END_TIME).fill(IGNORED_END_TIME);

    await allDay.check();
    await expect(page.locator(SELECTORS.TIME)).toBeDisabled();
    await expect(page.locator(SELECTORS.END_TIME)).toBeDisabled();
    await allDay.uncheck();
    await expect(page.locator(SELECTORS.TIME)).toBeEnabled();
    await expect(page.locator(SELECTORS.END_TIME)).toBeEnabled();
    await allDay.check();
    await submitDialog(page);

    await expect(eventPill(page, ALL_DAY_TITLE).locator(SELECTORS.EVENT_TIME)).toHaveText(LABELS.ALL_DAY);
    const [stored] = await eventsOfToday(page);
    expect(stored).toMatchObject({ title: ALL_DAY_TITLE, time: ALL_DAY_TIME, endTime: null, allDay: true });
  });

  test('drops an end time that lies before the start time', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await page.locator(SELECTORS.TITLE).fill(REVERSED_EVENT.TITLE);
    await page.locator(SELECTORS.TIME).fill(REVERSED_EVENT.TIME);
    await page.locator(SELECTORS.END_TIME).fill(REVERSED_EVENT.END_TIME);
    await submitDialog(page);

    await expect(eventPill(page, REVERSED_EVENT.TITLE).locator(SELECTORS.EVENT_TIME)).toHaveText(REVERSED_EVENT.TIME);
    const [stored] = await eventsOfToday(page);
    expect(stored.endTime).toBeNull();
  });

  test('does not save an event with an empty title', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await page.locator(SELECTORS.TITLE).fill(WHITESPACE_TITLE);
    await submitDialog(page);

    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
    expect(await eventsOfToday(page)).toHaveLength(0);
  });

  test('opens the create dialog at the double clicked time slot', async ({ calendar: { page } }) => {
    await page.locator(SELECTORS.WEEK_VIEW_BUTTON).click();
    await page.locator(SELECTORS.TIME_GRID_COLUMN).first().dblclick();

    await expect(page.locator(SELECTORS.HEADING)).toHaveText(LABELS.CREATE_TITLE);
    await expect(page.locator(SELECTORS.TIME)).toHaveValue(TIME_PATTERN);
  });

  test('ignores a submit of the untouched hidden form and a click on the hidden delete button', async ({ calendar: { page } }) => {
    await page.locator(SELECTORS.FORM).evaluate((form: HTMLFormElement) => form.requestSubmit());
    await page.locator(SELECTORS.DELETE).dispatchEvent('click');

    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
    expect(await eventsOfToday(page)).toHaveLength(0);
  });
});

test.describe('editing seeded events', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, legacyEvents: seededEvents(todayIso()) } });

  test('falls back to blue for an unknown color and shows an empty reminder', async ({ calendar: { page } }) => {
    await eventPill(page, SEEDED_EVENTS.UNKNOWN_COLOR.title).click();

    await expect(page.locator(SELECTORS.TITLE)).toHaveValue(SEEDED_EVENTS.UNKNOWN_COLOR.title);
    await expect(page.locator(SELECTORS.TIME)).toHaveValue(SEEDED_EVENTS.UNKNOWN_COLOR.time);
    await expect(page.locator(SELECTORS.END_TIME)).toHaveValue(NO_VALUE);
    await expect(page.locator(SELECTORS.NOTES)).toHaveValue(NO_VALUE);
    await expect(page.locator(SELECTORS.REMINDER)).toHaveValue(REMINDERS.NONE);
    await expect(page.locator(SELECTORS.ALL_DAY)).not.toBeChecked();
    await expect(page.locator(COLOR_INPUT_SELECTOR(COLORS.DEFAULT))).toBeChecked();
  });

  test('shows all stored values of a detailed event', async ({ calendar: { page } }) => {
    const { DETAILED } = SEEDED_EVENTS;
    await eventPill(page, DETAILED.title).click();

    await expect(page.locator(SELECTORS.HEADING)).toHaveText(LABELS.EDIT_TITLE);
    await expect(page.locator(SELECTORS.TITLE)).toHaveValue(DETAILED.title);
    await expect(page.locator(SELECTORS.TIME)).toHaveValue(DETAILED.time);
    await expect(page.locator(SELECTORS.END_TIME)).toHaveValue(DETAILED.endTime);
    await expect(page.locator(SELECTORS.NOTES)).toHaveValue(DETAILED.notes);
    await expect(page.locator(SELECTORS.REMINDER)).toHaveValue(REMINDERS.HALF_HOUR);
    await expect(page.locator(COLOR_INPUT_SELECTOR(COLORS.TEAL))).toBeChecked();
  });

  test('shows an all day event with disabled time fields', async ({ calendar: { page } }) => {
    await eventPill(page, SEEDED_EVENTS.ALL_DAY.title).click();

    await expect(page.locator(SELECTORS.ALL_DAY)).toBeChecked();
    await expect(page.locator(SELECTORS.TIME)).toBeDisabled();
    await expect(page.locator(SELECTORS.END_TIME)).toBeDisabled();
  });

  test('keeps the event id when saving an edit', async ({ calendar: { page } }) => {
    const { DETAILED } = SEEDED_EVENTS;
    await eventPill(page, DETAILED.title).click();
    await page.locator(SELECTORS.TITLE).fill(DRAFT_TITLE);
    await submitDialog(page);

    await expect(eventPill(page, DRAFT_TITLE)).toHaveCount(1);
    const stored = await eventsOfToday(page);
    expect(stored.find((event) => event.id === DETAILED.id)?.title).toBe(DRAFT_TITLE);
  });

  test('deletes an event from the edit dialog', async ({ calendar: { page } }) => {
    const { DETAILED } = SEEDED_EVENTS;
    await eventPill(page, DETAILED.title).click();
    await page.locator(SELECTORS.DELETE).click();

    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
    await expect(eventPill(page, DETAILED.title)).toHaveCount(0);
    const stored = await eventsOfToday(page);
    expect(stored.some((event) => event.id === DETAILED.id)).toBe(false);
  });
});

test.describe('discarding event dialog input', () => {
  test('closes directly on Escape without changes', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await page.keyboard.press(ESCAPE_KEY);

    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
  });

  test('asks on Escape with changes and keeps the values when continuing to edit', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await page.locator(SELECTORS.TITLE).fill(DRAFT_TITLE);

    await page.keyboard.press(ESCAPE_KEY);
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeVisible();
    await page.locator(SELECTORS.DISCARD_KEEP).click();
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
    await expect(page.locator(SELECTORS.TITLE)).toHaveValue(DRAFT_TITLE);

    await page.keyboard.press(ESCAPE_KEY);
    await page.locator(SELECTORS.DISCARD_CONFIRM).click();
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
  });

  test('ignores double clicks on dialog children but dismisses on the backdrop', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await page.locator(SELECTORS.HEADING).dblclick();
    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();

    await page.locator(SELECTORS.OVERLAY).dblclick(BACKDROP_CORNER);
    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
  });

  test('closes with the cancel button even with changes', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await page.locator(SELECTORS.TITLE).fill(DRAFT_TITLE);
    await page.locator(SELECTORS.CANCEL).click();

    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
  });

  test('ignores other keys while open and Escape while closed', async ({ calendar: { page } }) => {
    await page.keyboard.press(ESCAPE_KEY);
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();

    await openCreateDialog(page);
    await page.keyboard.press(TAB_KEY);
    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
  });

  test('ignores clicks on the hidden discard buttons without a pending question', async ({ calendar: { page } }) => {
    await page.locator(SELECTORS.DISCARD_KEEP).dispatchEvent('click');
    await page.locator(SELECTORS.DISCARD_CONFIRM).dispatchEvent('click');

    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
  });
});

test.describe('discarding settings dialog input', () => {
  test('closes directly on Escape without changes', async ({ calendar: { page } }) => {
    await openSettings(page);
    await page.keyboard.press(ESCAPE_KEY);

    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
  });

  test('asks on Escape with changes, keeps the values and discards on confirm', async ({ calendar: { page } }) => {
    await openSettings(page);
    await page.locator(SETTINGS_SELECTORS.CITY).fill(DRAFT_CITY);

    await page.keyboard.press(ESCAPE_KEY);
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeVisible();
    await page.keyboard.press(ESCAPE_KEY);
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
    await expect(page.locator(SETTINGS_SELECTORS.CITY)).toHaveValue(DRAFT_CITY);

    await page.locator(SETTINGS_SELECTORS.OVERLAY).dblclick(BACKDROP_CORNER);
    await page.locator(SELECTORS.DISCARD_CONFIRM).click();
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();

    await openSettings(page);
    await expect(page.locator(SETTINGS_SELECTORS.CITY)).toHaveValue(NO_VALUE);
  });

  test('closes with the cancel button even with changes', async ({ calendar: { page } }) => {
    await openSettings(page);
    await page.locator(SETTINGS_SELECTORS.CITY).fill(DRAFT_CITY);
    await page.locator(SETTINGS_SELECTORS.CANCEL).click();

    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();
  });

  test('closes directly on a backdrop double click without changes', async ({ calendar: { page } }) => {
    await openSettings(page);
    await page.locator(SETTINGS_SELECTORS.OVERLAY).dblclick(BACKDROP_CORNER);

    await expect(page.locator(SETTINGS_SELECTORS.OVERLAY)).toBeHidden();
  });
});
