import type { Locator, Page } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import {
  EVENT_CLASSES,
  SELECTORS as VIEW_SELECTORS,
  TODAY_ISO,
  dayCell,
  expectContinuation,
  fetchEventsBetween,
  freezeClock,
  removeAttribute,
  seedEvents
} from './support/calendarViewHelpers';
import { openSettings, SETTINGS_SELECTORS } from './support/settingsDialogActions';
import type { CalendarEvent } from '@shared/calendarEvent';

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
  END_DATE: '[data-dialog-end-date]',
  END_DATE_FIELD: '[data-dialog-end-date-field]',
  END_DATE_TRIGGER: '[data-dialog-end-date-field] [data-date-picker-trigger]',
  END_DATE_PICKER: '#endDatePicker',
  MULTI_DAY: '[data-dialog-multi-day]',
  RECURRENCE: '[data-dialog-recurrence]',
  RECURRENCE_DETAILS: '[data-dialog-recurrence-details]',
  INTERVAL: '[data-dialog-interval]',
  INTERVAL_UNIT: '[data-dialog-interval-unit]',
  UNTIL: '[data-dialog-until]',
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

const FREQUENCIES = { NONE: '', DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' } as const;

const INTERVAL_UNITS = [
  { frequency: FREQUENCIES.DAILY, unit: 'Tage' },
  { frequency: FREQUENCIES.WEEKLY, unit: 'Wochen' },
  { frequency: FREQUENCIES.MONTHLY, unit: 'Monate' },
  { frequency: FREQUENCIES.YEARLY, unit: 'Jahre' }
] as const;

const DATES = {
  SEPTEMBER_START: '2026-09-01',
  SEPTEMBER_THIRD: '2026-09-03',
  SEPTEMBER_FIFTH: '2026-09-05',
  SERIES_START: '2026-09-09',
  THURSDAY: '2026-09-17',
  FRIDAY: '2026-09-18',
  NEXT_WEDNESDAY: '2026-09-23',
  LAST_WEDNESDAY: '2026-09-30',
  OCTOBER_SERIES_END: '2026-10-14',
  OCTOBER_AFTER_END: '2026-10-28',
  OCTOBER_END: '2026-10-31'
} as const;

const SEGMENT_LABELS = { FROM_AFTERNOON: 'ab 14:00', UNTIL_MORNING: 'bis 10:00' } as const;

const PICKER = {
  TITLE: '.date-picker__title',
  PREVIOUS: '[aria-label="Vorheriger Monat"]',
  NEXT: '[aria-label="Nächster Monat"]',
  CLEAR: '.date-picker__action:has-text("Löschen")',
  TODAY: '.date-picker__action:has-text("Heute")',
  SELECTED_CLASS: /date-picker__day--selected/,
  TODAY_CLASS: /date-picker__day--today/,
  DAY_BEFORE_TODAY: '2026-09-15',
  SEPTEMBER: 'September 2026',
  OCTOBER: 'Oktober 2026'
} as const;

function pickerDay(picker: Locator, isoDate: string): Locator {
  return picker.locator('.date-picker__day[data-date="' + isoDate + '"]');
}
const EMPTY_INTERVAL = '';
const DEFAULT_INTERVAL = '1';
const BIWEEKLY_INTERVAL = '2';
const OCCURRENCE_DATE_LABEL = /Mittwoch, 23\. September/;
const NEXT_PERIOD = '#nextPeriod';

const MULTI_DAY = { TIMED_TITLE: 'Messe', ALL_DAY_TITLE: 'Urlaub', START: '14:00', END: '10:00' } as const;
const SERIES_TITLES = { WEEKLY: 'Training', BIWEEKLY: 'Jour fixe', DAILY: 'Tabletten', ENDING: 'Kurs', CHANGED: 'Laufgruppe' } as const;

const WEEKLY_SERIES = {
  date: DATES.SERIES_START,
  time: '18:00',
  title: SERIES_TITLES.WEEKLY,
  recurrence: { frequency: FREQUENCIES.WEEKLY, interval: 1, until: null }
};

const ENDING_SERIES = {
  date: DATES.SEPTEMBER_START,
  time: '07:00',
  title: SERIES_TITLES.ENDING,
  recurrence: { frequency: FREQUENCIES.DAILY, interval: 2, until: DATES.SEPTEMBER_FIFTH }
};

interface SegmentExpectation {
  date: string;
  label: string;
  continuesBefore: boolean;
  continuesAfter: boolean;
}

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

function pillOn(page: Page, date: string, title: string): Locator {
  return dayCell(page, date).locator(SELECTORS.EVENT, { hasText: title });
}

async function expectSegments(page: Page, title: string, segments: SegmentExpectation[]): Promise<void> {
  for (const { date, label, continuesBefore, continuesAfter } of segments) {
    const pill = pillOn(page, date, title);
    await expect(pill.locator(SELECTORS.EVENT_TIME)).toHaveText(label);
    await expectContinuation(pill, continuesBefore, continuesAfter);
  }
}

async function occurrenceDates(page: Page, title: string, from: string = DATES.SEPTEMBER_START, to: string = DATES.LAST_WEDNESDAY): Promise<string[]> {
  const events = await fetchEventsBetween(page, from, to);
  return events.filter((event) => event.title === title).map((event) => event.date);
}

async function openCreateDialogOnFrozenDay(page: Page): Promise<void> {
  await freezeClock(page);
  await openCreateDialog(page);
}

async function openSeriesOccurrence(page: Page, date: string): Promise<void> {
  await seedEvents(page, [WEEKLY_SERIES, ENDING_SERIES]);
  await freezeClock(page);
  await pillOn(page, date, SERIES_TITLES.WEEKLY).click();
  await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
}

async function chooseScope(page: Page, trigger: string, scopeSelector: string): Promise<void> {
  await page.locator(trigger).click();
  await expect(page.locator(VIEW_SELECTORS.SCOPE_OVERLAY)).toBeVisible();
  await page.locator(scopeSelector).click();
  await expect(page.locator(VIEW_SELECTORS.SCOPE_OVERLAY)).toBeHidden();
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

test.describe('multi day and recurring events', () => {
  test('shows the recurrence details only for a selected frequency with its unit', async ({ calendar: { page } }) => {
    await openCreateDialog(page);
    await expect(page.locator(SELECTORS.RECURRENCE)).toHaveValue(FREQUENCIES.NONE);
    await expect(page.locator(SELECTORS.RECURRENCE_DETAILS)).toBeHidden();
    await expect(page.locator(SELECTORS.INTERVAL)).toHaveValue(DEFAULT_INTERVAL);

    for (const { frequency, unit } of INTERVAL_UNITS) {
      await page.locator(SELECTORS.RECURRENCE).selectOption(frequency);
      await expect(page.locator(SELECTORS.RECURRENCE_DETAILS)).toBeVisible();
      await expect(page.locator(SELECTORS.INTERVAL_UNIT)).toHaveText(unit);
    }
    await page.locator(SELECTORS.RECURRENCE).selectOption(FREQUENCIES.NONE);
    await expect(page.locator(SELECTORS.RECURRENCE_DETAILS)).toBeHidden();
    await expect(page.locator(SELECTORS.INTERVAL_UNIT)).toHaveText(NO_VALUE);
  });

  test('creates a timed multi day event with a pill on every covered day', async ({ calendar: { page } }) => {
    await openCreateDialogOnFrozenDay(page);
    await expect(page.locator(SELECTORS.END_DATE)).toHaveAttribute('min', TODAY_ISO);
    await expect(page.locator(SELECTORS.END_DATE_FIELD)).toBeHidden();
    await page.locator(SELECTORS.TITLE).fill(MULTI_DAY.TIMED_TITLE);
    await page.locator(SELECTORS.TIME).fill(MULTI_DAY.START);
    await page.locator(SELECTORS.MULTI_DAY).check();
    await expect(page.locator(SELECTORS.END_DATE_FIELD)).toBeVisible();
    await page.locator(SELECTORS.END_DATE).fill(DATES.FRIDAY);
    await page.locator(SELECTORS.END_TIME).fill(MULTI_DAY.END);
    await submitDialog(page);

    await expectSegments(page, MULTI_DAY.TIMED_TITLE, [
      { date: TODAY_ISO, label: SEGMENT_LABELS.FROM_AFTERNOON, continuesBefore: false, continuesAfter: true },
      { date: DATES.THURSDAY, label: LABELS.ALL_DAY, continuesBefore: true, continuesAfter: true },
      { date: DATES.FRIDAY, label: SEGMENT_LABELS.UNTIL_MORNING, continuesBefore: true, continuesAfter: false }
    ]);
    const [stored] = await fetchEventsBetween(page, TODAY_ISO, TODAY_ISO);
    expect(stored).toMatchObject({ date: TODAY_ISO, endDate: DATES.FRIDAY, time: MULTI_DAY.START, endTime: MULTI_DAY.END, recurrence: null });

    await pillOn(page, DATES.THURSDAY, MULTI_DAY.TIMED_TITLE).click();
    await expect(page.locator(SELECTORS.MULTI_DAY)).toBeChecked();
    await expect(page.locator(SELECTORS.END_DATE)).toHaveValue(DATES.FRIDAY);
    await expect(page.locator(SELECTORS.RECURRENCE_DETAILS)).toBeHidden();

    await page.locator(SELECTORS.MULTI_DAY).uncheck();
    await expect(page.locator(SELECTORS.END_DATE_FIELD)).toBeHidden();
    await submitDialog(page);
    await expect(pillOn(page, DATES.THURSDAY, MULTI_DAY.TIMED_TITLE)).toHaveCount(0);
    const [singleDay] = await fetchEventsBetween(page, TODAY_ISO, TODAY_ISO);
    expect(singleDay.endDate).toBeNull();
  });

  test('picks the end date from the custom date picker', async ({ calendar: { page } }) => {
    await openCreateDialogOnFrozenDay(page);
    await page.locator(SELECTORS.MULTI_DAY).check();
    const trigger = page.locator(SELECTORS.END_DATE_TRIGGER);
    const picker = page.locator(SELECTORS.END_DATE_PICKER);

    await trigger.click();
    await expect(picker).toBeVisible();
    await expect(picker.locator(PICKER.TITLE)).toHaveText(PICKER.SEPTEMBER);
    await expect(pickerDay(picker, TODAY_ISO)).toHaveClass(PICKER.TODAY_CLASS);
    await expect(pickerDay(picker, PICKER.DAY_BEFORE_TODAY)).toBeDisabled();
    await picker.locator(PICKER.NEXT).click();
    await expect(picker.locator(PICKER.TITLE)).toHaveText(PICKER.OCTOBER);
    await picker.locator(PICKER.PREVIOUS).click();
    await expect(picker.locator(PICKER.TITLE)).toHaveText(PICKER.SEPTEMBER);
    await pickerDay(picker, DATES.FRIDAY).click();
    await expect(picker).toBeHidden();
    await expect(page.locator(SELECTORS.END_DATE)).toHaveValue(DATES.FRIDAY);

    await trigger.click();
    await expect(pickerDay(picker, DATES.FRIDAY)).toHaveClass(PICKER.SELECTED_CLASS);
    await page.keyboard.press(TAB_KEY);
    await expect(picker).toBeVisible();
    await page.keyboard.press(ESCAPE_KEY);
    await expect(picker).toBeHidden();
    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await picker.locator(PICKER.TODAY).click();
    await expect(page.locator(SELECTORS.END_DATE)).toHaveValue(TODAY_ISO);

    await trigger.click();
    await picker.locator(PICKER.CLEAR).click();
    await expect(page.locator(SELECTORS.END_DATE)).toHaveValue(NO_VALUE);

    await removeAttribute(page.locator(SELECTORS.END_DATE), 'min');
    await trigger.click();
    await expect(picker.locator(PICKER.TITLE)).toHaveText(PICKER.SEPTEMBER);
    await expect(pickerDay(picker, PICKER.DAY_BEFORE_TODAY)).toBeEnabled();
    await page.keyboard.press(ESCAPE_KEY);
  });

  test('creates an all day multi day event', async ({ calendar: { page } }) => {
    await openCreateDialogOnFrozenDay(page);
    await page.locator(SELECTORS.TITLE).fill(MULTI_DAY.ALL_DAY_TITLE);
    await page.locator(SELECTORS.ALL_DAY).check();
    await page.locator(SELECTORS.MULTI_DAY).check();
    await page.locator(SELECTORS.END_DATE).fill(DATES.THURSDAY);
    await submitDialog(page);

    await expectSegments(page, MULTI_DAY.ALL_DAY_TITLE, [
      { date: TODAY_ISO, label: LABELS.ALL_DAY, continuesBefore: false, continuesAfter: true },
      { date: DATES.THURSDAY, label: LABELS.ALL_DAY, continuesBefore: true, continuesAfter: false }
    ]);
  });

  test('creates a biweekly series that ends on the until date', async ({ calendar: { page } }) => {
    await openCreateDialogOnFrozenDay(page);
    await page.locator(SELECTORS.TITLE).fill(SERIES_TITLES.BIWEEKLY);
    await page.locator(SELECTORS.RECURRENCE).selectOption(FREQUENCIES.WEEKLY);
    await page.locator(SELECTORS.INTERVAL).fill(BIWEEKLY_INTERVAL);
    await page.locator(SELECTORS.UNTIL).fill(DATES.OCTOBER_SERIES_END);
    await submitDialog(page);

    await expect(pillOn(page, TODAY_ISO, SERIES_TITLES.BIWEEKLY)).toHaveClass(EVENT_CLASSES.RECURRING);
    await expect(pillOn(page, DATES.LAST_WEDNESDAY, SERIES_TITLES.BIWEEKLY)).toHaveClass(EVENT_CLASSES.RECURRING);
    await expect(pillOn(page, DATES.NEXT_WEDNESDAY, SERIES_TITLES.BIWEEKLY)).toHaveCount(0);
    await page.locator(NEXT_PERIOD).click();
    await expect(pillOn(page, DATES.OCTOBER_SERIES_END, SERIES_TITLES.BIWEEKLY)).toHaveCount(1);
    await expect(pillOn(page, DATES.OCTOBER_AFTER_END, SERIES_TITLES.BIWEEKLY)).toHaveCount(0);

    expect(await occurrenceDates(page, SERIES_TITLES.BIWEEKLY, TODAY_ISO, DATES.OCTOBER_END)).toEqual([TODAY_ISO, DATES.LAST_WEDNESDAY, DATES.OCTOBER_SERIES_END]);
    const [stored] = await fetchEventsBetween(page, TODAY_ISO, TODAY_ISO);
    expect(stored.recurrence).toEqual({ frequency: FREQUENCIES.WEEKLY, interval: Number(BIWEEKLY_INTERVAL), until: DATES.OCTOBER_SERIES_END });
  });

  test('falls back to an interval of one for an empty interval', async ({ calendar: { page } }) => {
    await openCreateDialogOnFrozenDay(page);
    await page.locator(SELECTORS.TITLE).fill(SERIES_TITLES.DAILY);
    await page.locator(SELECTORS.RECURRENCE).selectOption(FREQUENCIES.DAILY);
    await page.locator(SELECTORS.INTERVAL).fill(EMPTY_INTERVAL);
    await page.locator(SELECTORS.UNTIL).fill(DATES.FRIDAY);
    await submitDialog(page);

    await expect(pillOn(page, DATES.FRIDAY, SERIES_TITLES.DAILY)).toHaveCount(1);
    expect(await occurrenceDates(page, SERIES_TITLES.DAILY)).toEqual([TODAY_ISO, DATES.THURSDAY, DATES.FRIDAY]);
  });
});

test.describe('editing a series', () => {
  test('shows the occurrence date and the recurrence of the series', async ({ calendar: { page } }) => {
    await openSeriesOccurrence(page, DATES.NEXT_WEDNESDAY);
    await expect(page.locator(SELECTORS.DATE_LABEL)).toHaveText(OCCURRENCE_DATE_LABEL);
    await expect(page.locator(SELECTORS.RECURRENCE)).toHaveValue(FREQUENCIES.WEEKLY);
    await expect(page.locator(SELECTORS.RECURRENCE_DETAILS)).toBeVisible();
    await expect(page.locator(SELECTORS.INTERVAL)).toHaveValue(DEFAULT_INTERVAL);
    await expect(page.locator(SELECTORS.UNTIL)).toHaveValue(NO_VALUE);
    await page.locator(SELECTORS.CANCEL).click();

    await pillOn(page, DATES.SEPTEMBER_THIRD, SERIES_TITLES.ENDING).click();
    await expect(page.locator(SELECTORS.RECURRENCE)).toHaveValue(FREQUENCIES.DAILY);
    await expect(page.locator(SELECTORS.INTERVAL)).toHaveValue(String(ENDING_SERIES.recurrence.interval));
    await expect(page.locator(SELECTORS.UNTIL)).toHaveValue(DATES.SEPTEMBER_FIFTH);
    await expect(page.locator(SELECTORS.UNTIL)).toHaveAttribute('min', DATES.SEPTEMBER_THIRD);
  });

  test('changes only the edited occurrence and keeps the series', async ({ calendar: { page } }) => {
    await openSeriesOccurrence(page, DATES.NEXT_WEDNESDAY);
    await page.locator(SELECTORS.TITLE).fill(SERIES_TITLES.CHANGED);
    await chooseScope(page, SELECTORS.SUBMIT, VIEW_SELECTORS.SCOPE_OCCURRENCE);

    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
    await expect(pillOn(page, DATES.NEXT_WEDNESDAY, SERIES_TITLES.CHANGED)).not.toHaveClass(EVENT_CLASSES.RECURRING);
    expect(await occurrenceDates(page, SERIES_TITLES.WEEKLY)).toEqual([DATES.SERIES_START, TODAY_ISO, DATES.LAST_WEDNESDAY]);
    expect(await occurrenceDates(page, SERIES_TITLES.CHANGED)).toEqual([DATES.NEXT_WEDNESDAY]);
  });

  test('changes every occurrence of the series', async ({ calendar: { page } }) => {
    await openSeriesOccurrence(page, DATES.NEXT_WEDNESDAY);
    await page.locator(SELECTORS.TITLE).fill(SERIES_TITLES.CHANGED);
    await chooseScope(page, SELECTORS.SUBMIT, VIEW_SELECTORS.SCOPE_SERIES);

    await expect(pillOn(page, DATES.NEXT_WEDNESDAY, SERIES_TITLES.CHANGED)).toHaveClass(EVENT_CLASSES.RECURRING);
    expect(await occurrenceDates(page, SERIES_TITLES.WEEKLY)).toEqual([]);
    expect(await occurrenceDates(page, SERIES_TITLES.CHANGED))
      .toEqual([DATES.SERIES_START, TODAY_ISO, DATES.NEXT_WEDNESDAY, DATES.LAST_WEDNESDAY]);
  });

  test('keeps the dialog open and saves nothing when the scope prompt is cancelled', async ({ calendar: { page } }) => {
    await openSeriesOccurrence(page, DATES.NEXT_WEDNESDAY);
    await page.locator(SELECTORS.TITLE).fill(SERIES_TITLES.CHANGED);
    await chooseScope(page, SELECTORS.SUBMIT, VIEW_SELECTORS.SCOPE_CANCEL);
    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();

    await submitDialog(page);
    await expect(page.locator(VIEW_SELECTORS.SCOPE_OVERLAY)).toBeVisible();
    await page.keyboard.press(ESCAPE_KEY);
    await expect(page.locator(VIEW_SELECTORS.SCOPE_OVERLAY)).toBeHidden();
    await expect(page.locator(SELECTORS.DISCARD_OVERLAY)).toBeHidden();
    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
    await expect(page.locator(SELECTORS.TITLE)).toHaveValue(SERIES_TITLES.CHANGED);
    expect(await occurrenceDates(page, SERIES_TITLES.CHANGED)).toEqual([]);
  });

  test('deletes only the selected occurrence', async ({ calendar: { page } }) => {
    await openSeriesOccurrence(page, DATES.NEXT_WEDNESDAY);
    await chooseScope(page, SELECTORS.DELETE, VIEW_SELECTORS.SCOPE_OCCURRENCE);

    await expect(page.locator(SELECTORS.OVERLAY)).toBeHidden();
    await expect(pillOn(page, DATES.NEXT_WEDNESDAY, SERIES_TITLES.WEEKLY)).toHaveCount(0);
    expect(await occurrenceDates(page, SERIES_TITLES.WEEKLY)).toEqual([DATES.SERIES_START, TODAY_ISO, DATES.LAST_WEDNESDAY]);
  });

  test('deletes the whole series', async ({ calendar: { page } }) => {
    await openSeriesOccurrence(page, DATES.NEXT_WEDNESDAY);
    await chooseScope(page, SELECTORS.DELETE, VIEW_SELECTORS.SCOPE_SERIES);

    await expect(pillOn(page, TODAY_ISO, SERIES_TITLES.WEEKLY)).toHaveCount(0);
    expect(await occurrenceDates(page, SERIES_TITLES.WEEKLY)).toEqual([]);
  });

  test('keeps the series when deleting is cancelled', async ({ calendar: { page } }) => {
    await openSeriesOccurrence(page, DATES.NEXT_WEDNESDAY);
    await chooseScope(page, SELECTORS.DELETE, VIEW_SELECTORS.SCOPE_CANCEL);

    await expect(page.locator(SELECTORS.OVERLAY)).toBeVisible();
    expect(await occurrenceDates(page, SERIES_TITLES.WEEKLY))
      .toEqual([DATES.SERIES_START, TODAY_ISO, DATES.NEXT_WEDNESDAY, DATES.LAST_WEDNESDAY]);
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
