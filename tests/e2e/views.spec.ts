import type { Locator } from '@playwright/test';
import { DEFAULT_LAUNCH_OPTIONS, expect, test } from './support/calendarFixture';
import {
  SELECTORS,
  TODAY_ISO,
  VIEW_BUTTONS,
  allDayCell,
  collectPageErrors,
  dayCell,
  expectContinuation,
  freezeClock,
  pointAtMinutes,
  readStyleVariable,
  reloadWithoutElement,
  removeAttribute,
  scrollToMinutes,
  seedEvents,
  setAttribute,
  showView,
  timeGridColumn,
  waitForSettledView
} from './support/calendarViewHelpers';

const MONTH_CELL_COUNT = 35;
const WEEKDAY_COUNT = 7;
const OUTSIDE_DAY_COUNT = 5;
const WEEK_COLUMN_COUNT = 7;
const MINUTE_MS = 60000;
const NOW_MINUTES = '600';
const NEXT_MINUTE = '601';
const SLOT_MINUTES = 14 * 60 + 7;
const LAST_MINUTE = 1439;
const FIRST_MINUTE_OFFSET_PX = 1;
const LAST_MINUTE_OFFSET_PX = -1;
const BEFORE_MIDNIGHT = '2026-09-16T23:59:30';
const NEXT_DAY_ISO = '2026-09-17';

const CLASSES = {
  WEEKDAY: '.weekdays__label',
  OUTSIDE_DAY: '.day--outside',
  TODAY: '.day--today',
  HOLIDAY_NAME: '.day__holiday',
  TIME_GRID_DAY: '.time-grid__day',
  TIME_GRID_TODAY: '.time-grid__day--today',
  TIME_GRID_HOLIDAY: '.time-grid__day--holiday',
  TIME_GRID_HOLIDAY_NAME: '.time-grid__holiday',
  NOW_LINE: '.now-line',
  DAY_HEADER: '.day__header',
  DIALOG_CANCEL: '[data-dialog-cancel]',
  DIALOG_DELETE: '[data-dialog-delete]'
} as const;

const PATTERNS = {
  FIVE_WEEKS: /grid--weeks-5/,
  SIX_WEEKS: /grid--weeks-6/,
  HOLIDAY_DAY: /day--holiday/,
  HOLIDAY_COLUMN: /time-grid__column--holiday/,
  TODAY_COLUMN: /time-grid__column--today/,
  TODAY_ALL_DAY_CELL: /time-grid__all-day-cell--today/,
  DURATION_TWO: /event--duration-2/,
  DURATION_FOUR: /event--duration-4/,
  ANY_DURATION: /event--duration-/,
  COLOR_RED: /event--color-red/,
  COLOR_BLUE: /event--color-blue/
} as const;

const STYLE_VARIABLES = {
  START: '--block-start',
  MINUTES: '--block-minutes',
  COLUMN: '--block-column',
  COLUMNS: '--block-columns'
} as const;

const ATTRIBUTES = {
  EVENT_KEY: 'data-event-key',
  DATE: 'data-date',
  VIEW_MODE: 'data-view-mode'
} as const;

const TITLES = {
  SEPTEMBER: 'September',
  NOVEMBER: 'November',
  YEAR: '2026',
  WEEK_ACROSS_MONTHS: '28. September – 4. Oktober',
  DAY: 'Mittwoch, 16. September',
  NEXT_DAY: 'Donnerstag, 17. September',
  EDIT_DIALOG: 'Ereignis bearbeiten',
  CREATE_DIALOG: 'Neues Ereignis'
} as const;

const HOLIDAYS = {
  UNITY_DAY_ISO: '2026-10-03',
  UNITY_DAY: 'Tag der Deutschen Einheit',
  ASSUMPTION_ISO: '2026-08-15',
  ASSUMPTION: 'Mariä Himmelfahrt',
  ALL_SAINTS_ISO: '2026-11-01',
  ALL_SAINTS: 'Allerheiligen',
  REPENTANCE_ISO: '2026-11-18',
  REPENTANCE: 'Buß- und Bettag',
  COLLISION_NOW: '2008-05-01T10:00:00',
  COLLISION_ISO: '2008-05-01',
  COLLISION: 'Tag der Arbeit, Christi Himmelfahrt'
} as const;

const REGIONS = {
  BAVARIA: 'BY',
  SAXONY: 'SN'
} as const;

const TIMES = {
  SNAPPED_SLOT: '14:00',
  FIRST_SLOT: '00:00',
  LAST_SLOT: '23:45',
  ALL_DAY: 'Ganztägig',
  FROM_MORNING: 'ab 10:00',
  UNTIL_NOON: 'bis 12:00',
  FROM_NIGHT: 'ab 22:00'
} as const;

const DATES = {
  MONDAY: '2026-09-14',
  TUESDAY: '2026-09-15',
  THURSDAY: '2026-09-17',
  FRIDAY: '2026-09-18',
  SATURDAY: '2026-09-19'
} as const;

const UNKNOWN_EVENT_KEY = 'unknown-event@' + TODAY_ISO;
const UNKNOWN_VIEW_MODE = 'year';
const NEW_EVENT_TITLE = 'Doppelklick Termin';
const DISCARD_KEEP_SELECTOR = '[data-discard-keep]';
const VIEW_SWITCHER_BUTTONS = '#viewSwitcher button';
const WEEK_BUTTON_INDEX = 1;
const UNDATED_DAY_SELECTOR = SELECTORS.DAY + ':not([data-date])';

const MONTH_EVENTS = [
  { date: TODAY_ISO, time: '16:00', title: 'Offen' },
  { date: TODAY_ISO, time: '14:00', endTime: '15:00', title: 'Kurz' },
  { date: TODAY_ISO, time: '11:00', endTime: '13:00', title: 'Zwei' },
  { date: TODAY_ISO, time: '08:00', endTime: '20:00', title: 'Lang' },
  { date: TODAY_ISO, time: '00:00', allDay: true, title: 'Frei' }
];

const COLORED_EVENTS = [
  { date: TODAY_ISO, time: '09:00', title: 'Notiz', notes: 'Raum 4', color: 'red' },
  { date: TODAY_ISO, time: '10:00', title: 'Unbekannt', color: 'pink' },
  { date: TODAY_ISO, time: '11:00', title: 'Ohne', color: null }
];

const OVERLAPPING_EVENTS = [
  { date: TODAY_ISO, time: '09:00', endTime: '10:00', title: 'Kurz' },
  { date: TODAY_ISO, time: '09:00', endTime: '11:00', title: 'Lang' },
  { date: TODAY_ISO, time: '10:00', endTime: '10:30', title: 'Anschluss' },
  { date: TODAY_ISO, time: '12:00', title: 'Mittag' },
  { date: TODAY_ISO, time: '00:00', allDay: true, title: 'Ganztags' }
];

const MULTI_DAY_EVENTS = [
  { date: TODAY_ISO, time: '00:00', allDay: true, title: 'Frei' },
  { date: DATES.TUESDAY, endDate: DATES.THURSDAY, time: '00:00', allDay: true, title: 'Urlaub' },
  { date: DATES.TUESDAY, endDate: DATES.THURSDAY, time: '10:00', endTime: '12:00', title: 'Messe' },
  { date: DATES.FRIDAY, endDate: DATES.SATURDAY, time: '22:00', title: 'Nachtschicht' },
  { date: TODAY_ISO, time: '08:00', title: 'Früh' }
];

const SINGLE_EVENT = [{ date: TODAY_ISO, time: '09:00', endTime: '10:00', title: 'Termin' }];
const CROWDED_EVENT_COUNT = 8;
const CROWDED_FIRST_HOUR = 8;
const HOUR_PAD = 2;
const HOUR_PAD_CHARACTER = '0';
const CROWDED_EVENTS = Array.from({ length: CROWDED_EVENT_COUNT }, (_, index) => ({
  date: TODAY_ISO,
  time: String(CROWDED_FIRST_HOUR + index).padStart(HOUR_PAD, HOUR_PAD_CHARACTER) + ':00',
  title: 'Termin ' + (index + 1)
}));
const MORE_SELECTOR = '.day__more';
const EVENTS_SELECTOR = '.day__events';
const VISIBLE_EVENT_SELECTOR = SELECTORS.EVENT + ':visible';
const MORE_LABEL = /^\+(\d+) weitere$/;
const SINGLE_COLUMN = 1;

const BLOCK_TITLES = {
  HOUR: 'Sechzig',
  HALF_HOUR: 'Dreißig',
  QUARTER_HOUR: 'Fünfzehn',
  LONG_HALF_HOUR: 'Ausführliches Vorstellungsgespräch mit dem gesamten Entwicklungsteam vor Ort'
} as const;
const BLOCK_HEIGHT_EVENTS = [
  { date: TODAY_ISO, time: '12:00', endTime: '13:00', title: BLOCK_TITLES.HOUR },
  { date: TODAY_ISO, time: '13:00', endTime: '13:30', title: BLOCK_TITLES.HALF_HOUR },
  { date: TODAY_ISO, time: '14:00', endTime: '14:15', title: BLOCK_TITLES.QUARTER_HOUR },
  { date: TODAY_ISO, time: '15:00', endTime: '15:30', title: BLOCK_TITLES.LONG_HALF_HOUR }
];
const BLOCK_HEIGHT_SCROLL_MINUTES = 13 * 60;
const MIN_LABEL_HEIGHT_PX = 10;

type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error(await locator.evaluate((element) => element.className));
  return box;
}

async function bottomOf(locator: Locator): Promise<number> {
  const box = await boxOf(locator);
  return box.y + box.height;
}

async function topOf(locator: Locator): Promise<number> {
  return (await boxOf(locator)).y;
}

function eventByTitle(scope: Locator, title: string): Locator {
  return scope.locator(SELECTORS.EVENT, { hasText: title });
}

test.describe('month view', () => {
  test('renders a five week grid with weekday labels, outside days and today', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await expect(page.locator(CLASSES.WEEKDAY)).toHaveCount(WEEKDAY_COUNT);
    await expect(page.locator(SELECTORS.GRID)).toHaveClass(PATTERNS.FIVE_WEEKS);
    await expect(page.locator(SELECTORS.DAY)).toHaveCount(MONTH_CELL_COUNT);
    await expect(page.locator(CLASSES.OUTSIDE_DAY)).toHaveCount(OUTSIDE_DAY_COUNT);
    await expect(page.locator(CLASSES.TODAY)).toHaveAttribute(ATTRIBUTES.DATE, TODAY_ISO);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.SEPTEMBER);
    await expect(page.locator(SELECTORS.YEAR_LABEL)).toHaveText(TITLES.YEAR);
  });

  test('marks nationwide holidays in the default region', async ({ calendar: { page } }) => {
    await freezeClock(page);
    const unityDay = dayCell(page, HOLIDAYS.UNITY_DAY_ISO);
    await expect(unityDay).toHaveClass(PATTERNS.HOLIDAY_DAY);
    await expect(unityDay.locator(CLASSES.HOLIDAY_NAME)).toHaveText(HOLIDAYS.UNITY_DAY);
    await expect(unityDay.locator(CLASSES.HOLIDAY_NAME)).toHaveAttribute('title', HOLIDAYS.UNITY_DAY);
    await expect(dayCell(page, TODAY_ISO)).not.toHaveClass(PATTERNS.HOLIDAY_DAY);
  });

  test('joins holidays that fall on the same day', async ({ calendar: { page } }) => {
    await freezeClock(page, HOLIDAYS.COLLISION_NOW);
    await expect(dayCell(page, HOLIDAYS.COLLISION_ISO).locator(CLASSES.HOLIDAY_NAME)).toHaveText(HOLIDAYS.COLLISION);
  });

  test('replaces the week count class when a month needs six weeks', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await page.locator(SELECTORS.NEXT).click();
    await page.locator(SELECTORS.NEXT).click();
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.NOVEMBER);
    await expect(page.locator(SELECTORS.GRID)).toHaveClass(PATTERNS.SIX_WEEKS);
    await expect(page.locator(SELECTORS.GRID)).not.toHaveClass(PATTERNS.FIVE_WEEKS);
  });

  test('sorts pills by time and stretches them by duration', async ({ calendar: { page } }) => {
    await seedEvents(page, MONTH_EVENTS);
    await freezeClock(page);
    const today = dayCell(page, TODAY_ISO);
    await expect(today.locator(SELECTORS.EVENT_TITLE)).toHaveText(['Frei', 'Lang', 'Zwei', 'Kurz', 'Offen']);
    await expect(eventByTitle(today, 'Lang')).toHaveClass(PATTERNS.DURATION_FOUR);
    await expect(eventByTitle(today, 'Zwei')).toHaveClass(PATTERNS.DURATION_TWO);
    await expect(eventByTitle(today, 'Kurz')).not.toHaveClass(PATTERNS.ANY_DURATION);
    await expect(eventByTitle(today, 'Offen')).not.toHaveClass(PATTERNS.ANY_DURATION);
    await expect(eventByTitle(today, 'Frei').locator(SELECTORS.EVENT_TIME)).toHaveText(TIMES.ALL_DAY);
    await expect(eventByTitle(today, 'Kurz').locator(SELECTORS.EVENT_TIME)).toHaveText('14:00–15:00');
    await expect(eventByTitle(today, 'Offen').locator(SELECTORS.EVENT_TIME)).toHaveText('16:00');
  });

  test('collapses clipped pills into a more button that opens the day view', async ({ calendar: { page } }) => {
    await seedEvents(page, CROWDED_EVENTS);
    await freezeClock(page);
    const today = dayCell(page, TODAY_ISO);
    const moreButton = today.locator(CLASSES.DAY_HEADER).locator(MORE_SELECTOR);
    await expect(moreButton).toBeVisible();
    await expect(moreButton).toHaveText(MORE_LABEL);
    const hiddenCount = Number(MORE_LABEL.exec(await moreButton.innerText())?.[1]);
    const visiblePills = today.locator(VISIBLE_EVENT_SELECTOR);
    await expect(visiblePills).toHaveCount(CROWDED_EVENT_COUNT - hiddenCount);
    const limit = await bottomOf(today.locator(EVENTS_SELECTOR));
    for (const pill of await visiblePills.all()) expect(await bottomOf(pill)).toBeLessThanOrEqual(limit);

    await moreButton.click();
    await waitForSettledView(page);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.DAY);
    await expect(page.locator(SELECTORS.TIME_GRID_COLUMN)).toHaveCount(SINGLE_COLUMN);
    await expect(page.locator(SELECTORS.EVENT)).toHaveCount(CROWDED_EVENT_COUNT);
  });

  test('sorts multi day and all day pills first and marks continuing days', async ({ calendar: { page } }) => {
    await seedEvents(page, MULTI_DAY_EVENTS);
    await freezeClock(page);
    const today = dayCell(page, TODAY_ISO);
    await expect(today.locator(SELECTORS.EVENT_TITLE)).toHaveText(['Urlaub', 'Messe', 'Frei', 'Früh']);
    await expectContinuation(eventByTitle(today, 'Messe'), true, true);
    await expect(eventByTitle(today, 'Messe')).not.toHaveClass(PATTERNS.ANY_DURATION);
    await expectContinuation(eventByTitle(today, 'Frei'), false, false);
    await expect(eventByTitle(dayCell(page, DATES.TUESDAY), 'Messe').locator(SELECTORS.EVENT_TIME)).toHaveText(TIMES.FROM_MORNING);
    await expect(eventByTitle(dayCell(page, DATES.THURSDAY), 'Messe').locator(SELECTORS.EVENT_TIME)).toHaveText(TIMES.UNTIL_NOON);
    await expect(dayCell(page, DATES.MONDAY).locator(SELECTORS.EVENT)).toHaveCount(0);
  });

  test('shows notes in the tooltip and falls back to the default color', async ({ calendar: { page } }) => {
    await seedEvents(page, COLORED_EVENTS);
    await freezeClock(page);
    const today = dayCell(page, TODAY_ISO);
    await expect(eventByTitle(today, 'Notiz')).toHaveClass(PATTERNS.COLOR_RED);
    await expect(eventByTitle(today, 'Notiz')).toHaveAttribute('title', '09:00 Notiz\nRaum 4');
    await expect(eventByTitle(today, 'Unbekannt')).toHaveClass(PATTERNS.COLOR_BLUE);
    await expect(eventByTitle(today, 'Ohne')).toHaveClass(PATTERNS.COLOR_BLUE);
    await expect(eventByTitle(today, 'Ohne')).toHaveAttribute('title', '11:00 Ohne');
  });

  test('opens the edit dialog for a clicked pill and ignores clicks beside it', async ({ calendar: { page } }) => {
    await seedEvents(page, SINGLE_EVENT);
    await freezeClock(page);
    const today = dayCell(page, TODAY_ISO);
    await today.locator(CLASSES.DAY_HEADER).click();
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeHidden();

    await today.locator(SELECTORS.EVENT).click();
    await expect(page.locator(SELECTORS.DIALOG_HEADING)).toHaveText(TITLES.EDIT_DIALOG);
    await expect(page.locator(SELECTORS.DIALOG_TITLE)).toHaveValue('Termin');
  });

  test('opens the create dialog on double click of a day', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await dayCell(page, TODAY_ISO).dblclick();
    await expect(page.locator(SELECTORS.DIALOG_HEADING)).toHaveText(TITLES.CREATE_DIALOG);
  });
});

test.describe('holidays in Bavaria', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, settings: { holidayRegion: REGIONS.BAVARIA } } });

  test('shows Assumption Day in August and All Saints in November', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await page.locator(SELECTORS.PREVIOUS).click();
    await expect(dayCell(page, HOLIDAYS.ASSUMPTION_ISO).locator(CLASSES.HOLIDAY_NAME)).toHaveText(HOLIDAYS.ASSUMPTION);

    await page.locator(SELECTORS.NEXT).click();
    await page.locator(SELECTORS.NEXT).click();
    await page.locator(SELECTORS.NEXT).click();
    await expect(dayCell(page, HOLIDAYS.ALL_SAINTS_ISO).locator(CLASSES.HOLIDAY_NAME)).toHaveText(HOLIDAYS.ALL_SAINTS);
    await expect(dayCell(page, HOLIDAYS.REPENTANCE_ISO)).not.toHaveClass(PATTERNS.HOLIDAY_DAY);
  });
});

test.describe('holidays in Saxony', () => {
  test.use({ calendarLaunch: { ...DEFAULT_LAUNCH_OPTIONS, settings: { holidayRegion: REGIONS.SAXONY } } });

  test('shows the repentance day', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await page.locator(SELECTORS.NEXT).click();
    await page.locator(SELECTORS.NEXT).click();
    await expect(dayCell(page, HOLIDAYS.REPENTANCE_ISO).locator(CLASSES.HOLIDAY_NAME)).toHaveText(HOLIDAYS.REPENTANCE);
  });
});

test.describe('week view', () => {
  test('renders seven columns with today, the now line and holiday headers', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.WEEK);
    await expect(page.locator(SELECTORS.TIME_GRID_COLUMN)).toHaveCount(WEEK_COLUMN_COUNT);
    await expect(page.locator(CLASSES.TIME_GRID_DAY)).toHaveCount(WEEK_COLUMN_COUNT);
    await expect(page.locator(CLASSES.TIME_GRID_TODAY)).toHaveCount(1);
    await expect(timeGridColumn(page, TODAY_ISO)).toHaveClass(PATTERNS.TODAY_COLUMN);
    await expect(timeGridColumn(page, TODAY_ISO).locator(CLASSES.NOW_LINE)).toHaveCount(1);
    await expect(page.locator(CLASSES.TIME_GRID_HOLIDAY)).toHaveCount(0);

    await page.locator(SELECTORS.NEXT).click();
    await page.locator(SELECTORS.NEXT).click();
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.WEEK_ACROSS_MONTHS);
    await expect(page.locator(CLASSES.NOW_LINE)).toHaveCount(0);
    await expect(page.locator(CLASSES.TIME_GRID_HOLIDAY)).toHaveCount(1);
    await expect(page.locator(CLASSES.TIME_GRID_HOLIDAY_NAME)).toHaveText(HOLIDAYS.UNITY_DAY);
    await expect(timeGridColumn(page, HOLIDAYS.UNITY_DAY_ISO)).toHaveClass(PATTERNS.HOLIDAY_COLUMN);
  });

  test('lays out overlapping events side by side', async ({ calendar: { page } }) => {
    await seedEvents(page, OVERLAPPING_EVENTS);
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.WEEK);
    const column = timeGridColumn(page, TODAY_ISO);
    const expectedLayout = [
      { title: 'Lang', start: '540', minutes: '120', column: '0', columns: '2' },
      { title: 'Kurz', start: '540', minutes: '60', column: '1', columns: '2' },
      { title: 'Anschluss', start: '600', minutes: '30', column: '1', columns: '2' },
      { title: 'Mittag', start: '720', minutes: '60', column: '0', columns: '1' }
    ];
    for (const expected of expectedLayout) {
      const block = eventByTitle(column, expected.title);
      await expect(block).toBeVisible();
      expect(await readStyleVariable(block, STYLE_VARIABLES.START)).toBe(expected.start);
      expect(await readStyleVariable(block, STYLE_VARIABLES.MINUTES)).toBe(expected.minutes);
      expect(await readStyleVariable(block, STYLE_VARIABLES.COLUMN)).toBe(expected.column);
      expect(await readStyleVariable(block, STYLE_VARIABLES.COLUMNS)).toBe(expected.columns);
    }
    await expect(eventByTitle(column, 'Ganztags')).toHaveCount(0);
    await expect(eventByTitle(allDayCell(page, TODAY_ISO), 'Ganztags').locator(SELECTORS.EVENT_TIME)).toHaveText(TIMES.ALL_DAY);
  });

  test('opens the edit dialog for a clicked block and ignores clicks on empty slots', async ({ calendar: { page } }) => {
    await seedEvents(page, SINGLE_EVENT);
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.WEEK);
    const column = timeGridColumn(page, TODAY_ISO);
    await scrollToMinutes(page, SLOT_MINUTES);
    const emptySlot = await pointAtMinutes(column, SLOT_MINUTES);
    await page.mouse.click(emptySlot.x, emptySlot.y);
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeHidden();

    await column.locator(SELECTORS.EVENT).click();
    await expect(page.locator(SELECTORS.DIALOG_HEADING)).toHaveText(TITLES.EDIT_DIALOG);
    await expect(page.locator(SELECTORS.DIALOG_TITLE)).toHaveValue('Termin');
  });

  test('shows all day events in the all day row and splits timed multi day events into blocks', async ({ calendar: { page } }) => {
    await seedEvents(page, MULTI_DAY_EVENTS);
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.WEEK);

    await expect(allDayCell(page, TODAY_ISO)).toHaveClass(PATTERNS.TODAY_ALL_DAY_CELL);
    await expect(allDayCell(page, DATES.MONDAY)).not.toHaveClass(PATTERNS.TODAY_ALL_DAY_CELL);
    await expect(allDayCell(page, TODAY_ISO).locator(SELECTORS.EVENT_TITLE)).toHaveText(['Urlaub', 'Frei']);
    await expect(timeGridColumn(page, TODAY_ISO).locator(SELECTORS.EVENT_TITLE)).toHaveText(['Messe', 'Früh']);

    const vacationSegments = [
      { date: DATES.TUESDAY, continuesBefore: false, continuesAfter: true },
      { date: TODAY_ISO, continuesBefore: true, continuesAfter: true },
      { date: DATES.THURSDAY, continuesBefore: true, continuesAfter: false }
    ];
    for (const { date, continuesBefore, continuesAfter } of vacationSegments) {
      await expectContinuation(eventByTitle(allDayCell(page, date), 'Urlaub'), continuesBefore, continuesAfter);
      await expect(eventByTitle(allDayCell(page, date), 'Urlaub').locator(SELECTORS.EVENT_TIME)).toHaveText(TIMES.ALL_DAY);
    }

    const expectedBlocks = [
      { title: 'Messe', date: DATES.TUESDAY, start: '600', minutes: '840', label: TIMES.FROM_MORNING },
      { title: 'Messe', date: TODAY_ISO, start: '0', minutes: '1440', label: TIMES.ALL_DAY },
      { title: 'Messe', date: DATES.THURSDAY, start: '0', minutes: '720', label: TIMES.UNTIL_NOON },
      { title: 'Nachtschicht', date: DATES.FRIDAY, start: '1320', minutes: '120', label: TIMES.FROM_NIGHT },
      { title: 'Nachtschicht', date: DATES.SATURDAY, start: '0', minutes: '1440', label: TIMES.ALL_DAY }
    ];
    for (const expected of expectedBlocks) {
      const block = eventByTitle(timeGridColumn(page, expected.date), expected.title);
      await expect(block.locator(SELECTORS.EVENT_TIME)).toHaveText(expected.label);
      expect(await readStyleVariable(block, STYLE_VARIABLES.START)).toBe(expected.start);
      expect(await readStyleVariable(block, STYLE_VARIABLES.MINUTES)).toBe(expected.minutes);
    }
  });
});

test.describe('day view', () => {
  test('shows a single column and advances the now line every minute', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.DAY);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.DAY);
    await expect(page.locator(SELECTORS.TIME_GRID_COLUMN)).toHaveCount(1);
    const nowLine = page.locator(CLASSES.NOW_LINE);
    expect(await readStyleVariable(nowLine, STYLE_VARIABLES.START)).toBe(NOW_MINUTES);

    await page.clock.runFor(MINUTE_MS);
    expect(await readStyleVariable(nowLine, STYLE_VARIABLES.START)).toBe(NEXT_MINUTE);
  });

  test('creates an event at the snapped time on double click', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.DAY);
    const column = timeGridColumn(page, TODAY_ISO);
    await scrollToMinutes(page, SLOT_MINUTES);
    const slot = await pointAtMinutes(column, SLOT_MINUTES);
    await page.mouse.dblclick(slot.x, slot.y);
    await expect(page.locator(SELECTORS.DIALOG_TIME)).toHaveValue(TIMES.SNAPPED_SLOT);

    await page.locator(SELECTORS.DIALOG_SUBMIT).click();
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeVisible();
    await page.locator(SELECTORS.DIALOG_TITLE).fill(NEW_EVENT_TITLE);
    await page.locator(SELECTORS.DIALOG_SUBMIT).click();
    await expect(eventByTitle(column, NEW_EVENT_TITLE).locator(SELECTORS.EVENT_TIME)).toHaveText(TIMES.SNAPPED_SLOT);

    await eventByTitle(column, NEW_EVENT_TITLE).click();
    await page.locator(CLASSES.DIALOG_DELETE).click();
    await expect(column.locator(SELECTORS.EVENT)).toHaveCount(0);
  });

  test('keeps title and time readable inside short blocks', async ({ calendar: { page } }) => {
    await seedEvents(page, BLOCK_HEIGHT_EVENTS);
    await freezeClock(page);
    const column = timeGridColumn(page, TODAY_ISO);

    for (const view of [VIEW_BUTTONS.DAY, VIEW_BUTTONS.WEEK]) {
      await showView(page, view);
      await scrollToMinutes(page, BLOCK_HEIGHT_SCROLL_MINUTES);

      for (const { title } of BLOCK_HEIGHT_EVENTS) {
        const block = eventByTitle(column, title);
        const blockBox = await boxOf(block);
        const labelBoxes = [await boxOf(block.locator(SELECTORS.EVENT_TITLE)), await boxOf(block.locator(SELECTORS.EVENT_TIME))];
        for (const labelBox of labelBoxes) {
          expect(labelBox.height).toBeGreaterThanOrEqual(MIN_LABEL_HEIGHT_PX);
          expect(labelBox.y).toBeGreaterThanOrEqual(blockBox.y);
          expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(blockBox.y + blockBox.height);
        }
      }

      for (const title of [BLOCK_TITLES.HOUR, BLOCK_TITLES.HALF_HOUR, BLOCK_TITLES.LONG_HALF_HOUR]) {
        const stacked = eventByTitle(column, title);
        expect(await topOf(stacked.locator(SELECTORS.EVENT_TIME))).toBeGreaterThan(await topOf(stacked.locator(SELECTORS.EVENT_TITLE)));
      }
      const inline = eventByTitle(column, BLOCK_TITLES.QUARTER_HOUR);
      expect(await topOf(inline.locator(SELECTORS.EVENT_TIME))).toBe(await topOf(inline.locator(SELECTORS.EVENT_TITLE)));
    }
  });

  test('clamps double click times to the first and last slot of the day',async ({ calendar: { page } }) => {
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.DAY);
    const column = timeGridColumn(page, TODAY_ISO);

    await scrollToMinutes(page, 0);
    const top = await pointAtMinutes(column, 0, FIRST_MINUTE_OFFSET_PX);
    await page.mouse.dblclick(top.x, top.y);
    await expect(page.locator(SELECTORS.DIALOG_TIME)).toHaveValue(TIMES.FIRST_SLOT);
    await page.locator(CLASSES.DIALOG_CANCEL).click();

    await scrollToMinutes(page, LAST_MINUTE);
    const bottom = await pointAtMinutes(column, LAST_MINUTE + 1, LAST_MINUTE_OFFSET_PX);
    await page.mouse.dblclick(bottom.x, bottom.y);
    await expect(page.locator(SELECTORS.DIALOG_TIME)).toHaveValue(TIMES.LAST_SLOT);
  });
});

test.describe('day change', () => {
  test('moves the today marker after midnight in the month view', async ({ calendar: { page } }) => {
    await freezeClock(page, BEFORE_MIDNIGHT);
    await expect(page.locator(CLASSES.TODAY)).toHaveAttribute(ATTRIBUTES.DATE, TODAY_ISO);
    await page.clock.runFor(MINUTE_MS);
    await expect(page.locator(CLASSES.TODAY)).toHaveAttribute(ATTRIBUTES.DATE, NEXT_DAY_ISO);
  });

  test('follows today after midnight in the day view', async ({ calendar: { page } }) => {
    await freezeClock(page, BEFORE_MIDNIGHT);
    await showView(page, VIEW_BUTTONS.DAY);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.DAY);
    await page.clock.runFor(MINUTE_MS);
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.NEXT_DAY);
    await expect(timeGridColumn(page, NEXT_DAY_ISO)).toHaveCount(1);
    await expect(page.locator(CLASSES.TIME_GRID_TODAY)).toHaveCount(1);
  });
});

test.describe('edge cases', () => {
  test('ignores pills without a known event key in the month view', async ({ calendar: { page } }) => {
    await seedEvents(page, SINGLE_EVENT);
    await freezeClock(page);
    const pill = dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT);
    await setAttribute(pill, ATTRIBUTES.EVENT_KEY, UNKNOWN_EVENT_KEY);
    await pill.click();
    await removeAttribute(pill, ATTRIBUTES.EVENT_KEY);
    await pill.click();
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeHidden();
  });

  test('ignores blocks without a known event key in the time grid', async ({ calendar: { page } }) => {
    await seedEvents(page, SINGLE_EVENT);
    await freezeClock(page);
    await showView(page, VIEW_BUTTONS.DAY);
    const block = timeGridColumn(page, TODAY_ISO).locator(SELECTORS.EVENT);
    await setAttribute(block, ATTRIBUTES.EVENT_KEY, UNKNOWN_EVENT_KEY);
    await block.click();
    await removeAttribute(block, ATTRIBUTES.EVENT_KEY);
    await block.click();
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeHidden();
  });

  test('ignores double clicks on events and outside of day cells or columns', async ({ calendar: { page } }) => {
    await seedEvents(page, SINGLE_EVENT);
    await freezeClock(page);
    await dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT).dispatchEvent('dblclick');
    await page.locator(SELECTORS.GRID).dispatchEvent('dblclick');
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeHidden();

    await showView(page, VIEW_BUTTONS.DAY);
    await timeGridColumn(page, TODAY_ISO).locator(SELECTORS.EVENT).dispatchEvent('dblclick');
    await page.locator(SELECTORS.TIME_GRID_COLUMNS).dispatchEvent('dblclick');
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeHidden();
  });

  test('ignores clicks dispatched on text nodes', async ({ calendar: { page } }) => {
    await seedEvents(page, SINGLE_EVENT);
    await freezeClock(page);
    await dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT_TITLE).evaluate((title) => {
      title.firstChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeHidden();
  });

  test('opens the create dialog for day cells and columns without a date', async ({ calendar: { page } }) => {
    await freezeClock(page);
    await removeAttribute(dayCell(page, TODAY_ISO), ATTRIBUTES.DATE);
    await page.locator(UNDATED_DAY_SELECTOR).dblclick();
    await expect(page.locator(SELECTORS.DIALOG_OVERLAY)).toBeVisible();
    await page.locator(CLASSES.DIALOG_CANCEL).click();

    await showView(page, VIEW_BUTTONS.DAY);
    const column = timeGridColumn(page, TODAY_ISO);
    await scrollToMinutes(page, SLOT_MINUTES);
    const slot = await pointAtMinutes(column, SLOT_MINUTES);
    await removeAttribute(column, ATTRIBUTES.DATE);
    await page.mouse.dblclick(slot.x, slot.y);
    await expect(page.locator(SELECTORS.DIALOG_TIME)).toHaveValue(TIMES.SNAPPED_SLOT);
  });

  test('falls back to the month view for view buttons without a known mode', async ({ calendar: { page } }) => {
    await freezeClock(page);
    const weekButtonByPosition = page.locator(VIEW_SWITCHER_BUTTONS).nth(WEEK_BUTTON_INDEX);
    await showView(page, VIEW_BUTTONS.DAY);
    await removeAttribute(weekButtonByPosition, ATTRIBUTES.VIEW_MODE);
    await weekButtonByPosition.click();
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.SEPTEMBER);

    await showView(page, VIEW_BUTTONS.DAY);
    await setAttribute(weekButtonByPosition, ATTRIBUTES.VIEW_MODE, UNKNOWN_VIEW_MODE);
    await weekButtonByPosition.click();
    await expect(page.locator(SELECTORS.MONTH_NAME)).toHaveText(TITLES.SEPTEMBER);
  });

  test('fails fast when a required element is missing', async ({ calendar: { page } }) => {
    const errors = collectPageErrors(page);
    await reloadWithoutElement(page, SELECTORS.MONTH_NAME);
    await expect.poll(() => errors.map((error) => error.message)).toContain('monthName');
  });

  test('fails fast when a required dialog element is missing', async ({ calendar: { page } }) => {
    const errors = collectPageErrors(page);
    await reloadWithoutElement(page, DISCARD_KEEP_SELECTOR);
    await expect.poll(() => errors.map((error) => error.message)).toContain(DISCARD_KEEP_SELECTOR);
  });
});
