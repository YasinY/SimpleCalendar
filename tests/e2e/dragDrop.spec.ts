import type { Locator, Page } from '@playwright/test';
import { expect, test } from './support/calendarFixture';
import {
  DROP_TARGET_CLASS,
  EVENT_CLASSES,
  SELECTORS,
  TODAY_ISO,
  VIEW_BUTTONS,
  allDayCell,
  centerOf,
  collectPageErrors,
  dayCell,
  dragWithMouse,
  fetchEventByTitle,
  fetchEvents,
  fetchEventsBetween,
  freezeClock,
  pointAtMinutes,
  removeAttribute,
  scrollToMinutes,
  seedEvents,
  showView,
  timeGridColumn
} from './support/calendarViewHelpers';

const TARGET_ISO = '2026-09-18';
const NEIGHBOUR_ISO = '2026-09-17';
const DROP_TARGET_SELECTOR = '.drop-target';
const DATE_ATTRIBUTE = 'data-date';
const UNDATED_DAY_SELECTOR = SELECTORS.DAY + ':not([' + DATE_ATTRIBUTE + '])';
const UNDATED_COLUMN_SELECTOR = SELECTORS.TIME_GRID_COLUMN + ':not([' + DATE_ATTRIBUTE + '])';
const GRAB_OFFSET_PX = 10;
const POINTER_NUDGE_PX = 1;
const MORNING_MINUTES = 9 * 60;
const LATE_MORNING_MINUTES = 11 * 60;
const EARLY_AFTERNOON_MINUTES = 13 * 60;
const NIGHT_MINUTES = 3 * 60;
const EVENING_MINUTES = 21 * 60;
const LATE_EVENING_MINUTES = 23 * 60;
const INVALID_PAYLOAD = 'kein json';
const UNKNOWN_PAYLOAD = JSON.stringify({ eventKey: 'unknown-event@' + TODAY_ISO, dayOffset: 0, offsetMinutes: 0 });
const SEPTEMBER = { from: '2026-09-01', to: '2026-09-30' };

const DATES = {
  MONDAY: '2026-09-14',
  TUESDAY: '2026-09-15',
  NEXT_MONDAY: '2026-09-21',
  NEXT_TUESDAY: '2026-09-22',
  NEXT_WEDNESDAY: '2026-09-23',
  NEXT_THURSDAY: '2026-09-24',
  LAST_MONDAY: '2026-09-28',
  LAST_WEDNESDAY: '2026-09-30'
} as const;

const DRAG_EVENT_TYPES = {
  START: 'dragstart',
  OVER: 'dragover',
  LEAVE: 'dragleave',
  DROP: 'drop',
  END: 'dragend'
} as const;

const TITLES = {
  MONTH: 'Umzug',
  TIMED: 'Block',
  OPEN: 'Offen',
  ALL_DAY: 'Ganztags',
  TRIP: 'Reise',
  NIGHT: 'Nachtfahrt',
  SERIES: 'Sport'
} as const;

const TIMED_EVENT = { date: TODAY_ISO, time: '09:00', endTime: '10:00', title: TITLES.TIMED };
const OPEN_EVENT = { date: TODAY_ISO, time: '09:00', title: TITLES.OPEN };
const ALL_DAY_EVENT = { date: TODAY_ISO, time: '00:00', allDay: true, title: TITLES.ALL_DAY };
const MONTH_EVENT = { date: TODAY_ISO, time: '10:00', endTime: '11:00', title: TITLES.MONTH };
const NIGHT_LABELS = { MOVED_START: 'ab 23:00', END: 'bis 01:00' } as const;
const TRIP_EVENT = { date: DATES.TUESDAY, endDate: NEIGHBOUR_ISO, time: '00:00', allDay: true, title: TITLES.TRIP };
const NIGHT_EVENT = { date: TODAY_ISO, endDate: NEIGHBOUR_ISO, time: '22:00', endTime: '01:00', title: TITLES.NIGHT };
const SERIES_EVENT = { date: DATES.MONDAY, time: '18:00', title: TITLES.SERIES, recurrence: { frequency: 'weekly' as const, interval: 1, until: null } };

interface SyntheticDragOptions {
  data?: string;
  relatedSelector?: string;
}

async function dispatchDrag(target: Locator, type: string, { data, relatedSelector }: SyntheticDragOptions = {}): Promise<boolean> {
  return target.evaluate((element, init) => {
    const eventInit: DragEventInit = { bubbles: true, cancelable: true };
    if (init.data !== undefined) {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', init.data);
      eventInit.dataTransfer = dataTransfer;
    }
    if (init.relatedSelector !== undefined) eventInit.relatedTarget = document.querySelector(init.relatedSelector);
    return element.dispatchEvent(new DragEvent(init.type, eventInit));
  }, { type, data, relatedSelector });
}

async function dispatchDocumentDragEnd(page: Page): Promise<void> {
  await page.evaluate((type) => document.dispatchEvent(new DragEvent(type)), DRAG_EVENT_TYPES.END);
}

async function moveDuringDrag(page: Page, point: { x: number; y: number }): Promise<void> {
  await page.mouse.move(point.x, point.y);
  await page.mouse.move(point.x + POINTER_NUDGE_PX, point.y + POINTER_NUDGE_PX);
}

async function dragBlockTo(page: Page, block: Locator, column: Locator, minutes: number): Promise<void> {
  const box = await block.boundingBox();
  if (!box) throw new Error('block not rendered');
  const grab = { x: box.x + GRAB_OFFSET_PX, y: box.y + GRAB_OFFSET_PX };
  const drop = await pointAtMinutes(column, minutes, GRAB_OFFSET_PX);
  await dragWithMouse(page, grab, drop);
}

async function occurrenceDates(page: Page, title: string): Promise<string[]> {
  const events = await fetchEventsBetween(page, SEPTEMBER.from, SEPTEMBER.to);
  return events.filter((event) => event.title === title).map((event) => event.date);
}

async function dragSeriesOccurrence(page: Page, scopeSelector: string): Promise<void> {
  await seedEvents(page, [SERIES_EVENT]);
  await freezeClock(page);
  await dayCell(page, DATES.NEXT_MONDAY).locator(SELECTORS.EVENT).dragTo(dayCell(page, DATES.NEXT_WEDNESDAY));
  await expect(page.locator(SELECTORS.SCOPE_OVERLAY)).toBeVisible();
  await page.locator(scopeSelector).click();
  await expect(page.locator(SELECTORS.SCOPE_OVERLAY)).toBeHidden();
}

async function openWeekWith(page: Page, events: Parameters<typeof seedEvents>[1], scrollMinutes: number): Promise<void> {
  await seedEvents(page, events);
  await freezeClock(page);
  await showView(page, VIEW_BUTTONS.WEEK);
  await scrollToMinutes(page, scrollMinutes);
}

test.describe('month view', () => {
  test('moves a pill to another day and keeps its time', async ({ calendar: { page } }) => {
    await seedEvents(page, [MONTH_EVENT]);
    await freezeClock(page);
    await dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT).dragTo(dayCell(page, TARGET_ISO));

    await expect(dayCell(page, TARGET_ISO).locator(SELECTORS.EVENT_TITLE)).toHaveText(TITLES.MONTH);
    await expect(dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT)).toHaveCount(0);
    const moved = await fetchEventByTitle(page, TITLES.MONTH);
    expect(moved).toMatchObject({ date: TARGET_ISO, time: MONTH_EVENT.time, endTime: MONTH_EVENT.endTime });
  });

  test('moves a multi day event by the offset of the dragged middle day', async ({ calendar: { page } }) => {
    await seedEvents(page, [TRIP_EVENT]);
    await freezeClock(page);
    await dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT).dragTo(dayCell(page, DATES.NEXT_WEDNESDAY));

    for (const date of [DATES.NEXT_TUESDAY, DATES.NEXT_WEDNESDAY, DATES.NEXT_THURSDAY]) {
      await expect(dayCell(page, date).locator(SELECTORS.EVENT_TITLE)).toHaveText(TITLES.TRIP);
    }
    await expect(dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT)).toHaveCount(0);
    const moved = await fetchEventByTitle(page, TITLES.TRIP);
    expect(moved).toMatchObject({ date: DATES.NEXT_TUESDAY, endDate: DATES.NEXT_THURSDAY, allDay: true });
  });

  test('shifts the whole series when a dragged occurrence applies to the series', async ({ calendar: { page } }) => {
    await dragSeriesOccurrence(page, SELECTORS.SCOPE_SERIES);

    await expect(dayCell(page, DATES.NEXT_WEDNESDAY).locator(SELECTORS.EVENT)).toHaveClass(EVENT_CLASSES.RECURRING);
    await expect(dayCell(page, DATES.MONDAY).locator(SELECTORS.EVENT)).toHaveCount(0);
    expect(await occurrenceDates(page, TITLES.SERIES)).toEqual([TODAY_ISO, DATES.NEXT_WEDNESDAY, DATES.LAST_WEDNESDAY]);
  });

  test('detaches only the dragged occurrence from the series', async ({ calendar: { page } }) => {
    await dragSeriesOccurrence(page, SELECTORS.SCOPE_OCCURRENCE);

    await expect(dayCell(page, DATES.NEXT_WEDNESDAY).locator(SELECTORS.EVENT)).not.toHaveClass(EVENT_CLASSES.RECURRING);
    await expect(dayCell(page, DATES.NEXT_MONDAY).locator(SELECTORS.EVENT)).toHaveCount(0);
    const events = await fetchEventsBetween(page, SEPTEMBER.from, SEPTEMBER.to);
    const detached = events.find((event) => event.date === DATES.NEXT_WEDNESDAY);
    const series = events.find((event) => event.date === DATES.MONDAY);
    expect(detached).toMatchObject({ title: TITLES.SERIES, time: SERIES_EVENT.time, recurrence: null });
    expect(detached?.id).not.toBe(series?.id);
    expect(await occurrenceDates(page, TITLES.SERIES)).toEqual([DATES.MONDAY, DATES.NEXT_WEDNESDAY, DATES.LAST_MONDAY]);
  });

  test('keeps the series unchanged when the scope prompt is cancelled', async ({ calendar: { page } }) => {
    await dragSeriesOccurrence(page, SELECTORS.SCOPE_CANCEL);

    await expect(dayCell(page, DATES.NEXT_MONDAY).locator(SELECTORS.EVENT)).toHaveCount(1);
    expect(await occurrenceDates(page, TITLES.SERIES)).toEqual([DATES.MONDAY, DATES.NEXT_MONDAY, DATES.LAST_MONDAY]);
  });

  test('highlights the day under the dragged pill and clears it after the drop', async ({ calendar: { page } }) => {
    await seedEvents(page, [MONTH_EVENT]);
    await freezeClock(page);
    const source = await centerOf(dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT));
    const neighbour = await centerOf(dayCell(page, NEIGHBOUR_ISO));
    const target = await centerOf(dayCell(page, TARGET_ISO));

    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    await moveDuringDrag(page, neighbour);
    await expect(dayCell(page, NEIGHBOUR_ISO)).toHaveClass(DROP_TARGET_CLASS);
    await moveDuringDrag(page, target);
    await expect(dayCell(page, TARGET_ISO)).toHaveClass(DROP_TARGET_CLASS);
    await expect(dayCell(page, NEIGHBOUR_ISO)).not.toHaveClass(DROP_TARGET_CLASS);
    await page.mouse.up();

    await expect(page.locator(DROP_TARGET_SELECTOR)).toHaveCount(0);
    await expect(dayCell(page, TARGET_ISO).locator(SELECTORS.EVENT_TITLE)).toHaveText(TITLES.MONTH);
  });

  test('clears the highlight when the pill leaves the grid', async ({ calendar: { page } }) => {
    await seedEvents(page, [MONTH_EVENT]);
    await freezeClock(page);
    const source = await centerOf(dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT));
    const target = await centerOf(dayCell(page, TARGET_ISO));
    const outside = await centerOf(page.locator(SELECTORS.MONTH_NAME));

    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    await moveDuringDrag(page, target);
    await expect(dayCell(page, TARGET_ISO)).toHaveClass(DROP_TARGET_CLASS);
    await moveDuringDrag(page, outside);
    await expect(page.locator(DROP_TARGET_SELECTOR)).toHaveCount(0);
    await page.mouse.up();

    const unmoved = await fetchEventByTitle(page, TITLES.MONTH);
    expect(unmoved?.date).toBe(TODAY_ISO);
  });
});

test.describe('time grid', () => {
  test('moves a timed block to another day and time keeping its duration', async ({ calendar: { page } }) => {
    await openWeekWith(page, [TIMED_EVENT], MORNING_MINUTES);
    const block = timeGridColumn(page, TODAY_ISO).locator(SELECTORS.EVENT);
    await dragBlockTo(page, block, timeGridColumn(page, NEIGHBOUR_ISO), LATE_MORNING_MINUTES);

    await expect(timeGridColumn(page, NEIGHBOUR_ISO).locator(SELECTORS.EVENT_TIME)).toHaveText('11:00–12:00');
    const moved = await fetchEventByTitle(page, TITLES.TIMED);
    expect(moved).toMatchObject({ date: NEIGHBOUR_ISO, time: '11:00', endTime: '12:00' });
  });

  test('moves a block without end time to a new start time', async ({ calendar: { page } }) => {
    await openWeekWith(page, [OPEN_EVENT], MORNING_MINUTES);
    const column = timeGridColumn(page, TODAY_ISO);
    await dragBlockTo(page, column.locator(SELECTORS.EVENT), column, EARLY_AFTERNOON_MINUTES);

    await expect(column.locator(SELECTORS.EVENT_TIME)).toHaveText('13:00');
    const moved = await fetchEventByTitle(page, TITLES.OPEN);
    expect(moved).toMatchObject({ date: TODAY_ISO, time: '13:00', endTime: null });
  });

  test('moves an all day pill within the all day row to another day', async ({ calendar: { page } }) => {
    await openWeekWith(page, [ALL_DAY_EVENT], NIGHT_MINUTES);
    await allDayCell(page, TODAY_ISO).locator(SELECTORS.EVENT).dragTo(allDayCell(page, TARGET_ISO));

    await expect(allDayCell(page, TARGET_ISO).locator(SELECTORS.EVENT_TITLE)).toHaveText(TITLES.ALL_DAY);
    const moved = await fetchEventByTitle(page, TITLES.ALL_DAY);
    expect(moved).toMatchObject({ date: TARGET_ISO, time: ALL_DAY_EVENT.time, allDay: true });
  });

  test('drops an all day pill into a time column without changing its time', async ({ calendar: { page } }) => {
    await openWeekWith(page, [ALL_DAY_EVENT], NIGHT_MINUTES);
    const source = await centerOf(allDayCell(page, TODAY_ISO).locator(SELECTORS.EVENT));
    await dragWithMouse(page, source, await pointAtMinutes(timeGridColumn(page, TARGET_ISO), NIGHT_MINUTES));

    await expect(allDayCell(page, TARGET_ISO).locator(SELECTORS.EVENT_TITLE)).toHaveText(TITLES.ALL_DAY);
    const moved = await fetchEventByTitle(page, TITLES.ALL_DAY);
    expect(moved).toMatchObject({ date: TARGET_ISO, time: ALL_DAY_EVENT.time, allDay: true });
  });

  test('moves the start of a timed multi day event and keeps its end time', async ({ calendar: { page } }) => {
    await openWeekWith(page, [NIGHT_EVENT], EVENING_MINUTES);
    const block = timeGridColumn(page, TODAY_ISO).locator(SELECTORS.EVENT);
    await dragBlockTo(page, block, timeGridColumn(page, NEIGHBOUR_ISO), LATE_EVENING_MINUTES);

    await expect(timeGridColumn(page, NEIGHBOUR_ISO).locator(SELECTORS.EVENT_TIME)).toHaveText(NIGHT_LABELS.MOVED_START);
    const moved = await fetchEventByTitle(page, TITLES.NIGHT);
    expect(moved).toMatchObject({ date: NEIGHBOUR_ISO, endDate: TARGET_ISO, time: '23:00', endTime: NIGHT_EVENT.endTime });
  });

  test('keeps the time when a later day of a timed multi day event is dropped into a time column', async ({ calendar: { page } }) => {
    await openWeekWith(page, [NIGHT_EVENT], 0);
    const block = timeGridColumn(page, NEIGHBOUR_ISO).locator(SELECTORS.EVENT);
    await dragBlockTo(page, block, timeGridColumn(page, TARGET_ISO), NIGHT_MINUTES);

    await expect(timeGridColumn(page, TARGET_ISO).locator(SELECTORS.EVENT_TIME)).toHaveText(NIGHT_LABELS.END);
    const moved = await fetchEventByTitle(page, TITLES.NIGHT);
    expect(moved).toMatchObject({ date: NEIGHBOUR_ISO, endDate: TARGET_ISO, time: NIGHT_EVENT.time, endTime: NIGHT_EVENT.endTime });
  });

  test('highlights the column under a dragged block', async ({ calendar: { page } }) => {
    await openWeekWith(page, [TIMED_EVENT], MORNING_MINUTES);
    const box = await timeGridColumn(page, TODAY_ISO).locator(SELECTORS.EVENT).boundingBox();
    if (!box) throw new Error('block not rendered');
    const target = await pointAtMinutes(timeGridColumn(page, TARGET_ISO), LATE_MORNING_MINUTES);

    await page.mouse.move(box.x + GRAB_OFFSET_PX, box.y + GRAB_OFFSET_PX);
    await page.mouse.down();
    await moveDuringDrag(page, target);
    await expect(timeGridColumn(page, TARGET_ISO)).toHaveClass(DROP_TARGET_CLASS);
    await page.mouse.up();
    await expect(page.locator(DROP_TARGET_SELECTOR)).toHaveCount(0);
  });
});

test.describe('edge cases', () => {
  test('ignores drag starts without data transfer', async ({ calendar: { page } }) => {
    await seedEvents(page, [MONTH_EVENT]);
    await freezeClock(page);
    const errors = collectPageErrors(page);
    const notCancelled = await dispatchDrag(dayCell(page, TODAY_ISO).locator(SELECTORS.EVENT), DRAG_EVENT_TYPES.START);
    expect(notCancelled).toBe(true);
    expect(errors).toHaveLength(0);
  });

  test('highlights a zone on drag over without data transfer and clears it on drag end', async ({ calendar: { page } }) => {
    await freezeClock(page);
    const target = dayCell(page, TARGET_ISO);
    expect(await dispatchDrag(target, DRAG_EVENT_TYPES.OVER)).toBe(false);
    expect(await dispatchDrag(target, DRAG_EVENT_TYPES.OVER)).toBe(false);
    await expect(target).toHaveClass(DROP_TARGET_CLASS);

    await dispatchDocumentDragEnd(page);
    await expect(page.locator(DROP_TARGET_SELECTOR)).toHaveCount(0);
  });

  test('ignores drag over outside of drop zones', async ({ calendar: { page } }) => {
    await freezeClock(page);
    expect(await dispatchDrag(page.locator(SELECTORS.GRID), DRAG_EVENT_TYPES.OVER, { data: UNKNOWN_PAYLOAD })).toBe(true);
    await expect(page.locator(DROP_TARGET_SELECTOR)).toHaveCount(0);
  });

  test('keeps the highlight while the drag moves within the grid', async ({ calendar: { page } }) => {
    await freezeClock(page);
    const target = dayCell(page, TARGET_ISO);
    const neighbourSelector = SELECTORS.DAY + '[' + DATE_ATTRIBUTE + '="' + NEIGHBOUR_ISO + '"]';
    await dispatchDrag(target, DRAG_EVENT_TYPES.OVER, { data: UNKNOWN_PAYLOAD });
    await dispatchDrag(target, DRAG_EVENT_TYPES.LEAVE, { relatedSelector: neighbourSelector });
    await expect(target).toHaveClass(DROP_TARGET_CLASS);

    await dispatchDrag(target, DRAG_EVENT_TYPES.LEAVE, { relatedSelector: SELECTORS.MONTH_NAME });
    await expect(page.locator(DROP_TARGET_SELECTOR)).toHaveCount(0);
  });

  test('ignores drops outside of zones, without data transfer or with an invalid payload', async ({ calendar: { page } }) => {
    await seedEvents(page, [MONTH_EVENT]);
    await freezeClock(page);
    const target = dayCell(page, TARGET_ISO);
    expect(await dispatchDrag(page.locator(SELECTORS.GRID), DRAG_EVENT_TYPES.DROP, { data: UNKNOWN_PAYLOAD })).toBe(true);
    expect(await dispatchDrag(target, DRAG_EVENT_TYPES.DROP)).toBe(true);
    expect(await dispatchDrag(target, DRAG_EVENT_TYPES.DROP, { data: INVALID_PAYLOAD })).toBe(false);

    const unmoved = await fetchEventByTitle(page, TITLES.MONTH);
    expect(unmoved?.date).toBe(TODAY_ISO);
  });

  test('ignores drops of unknown events on zones without a date', async ({ calendar: { page } }) => {
    await seedEvents(page, [MONTH_EVENT]);
    await freezeClock(page);
    const eventsBefore = await fetchEvents(page);
    await removeAttribute(dayCell(page, TARGET_ISO), DATE_ATTRIBUTE);
    expect(await dispatchDrag(page.locator(UNDATED_DAY_SELECTOR), DRAG_EVENT_TYPES.DROP, { data: UNKNOWN_PAYLOAD })).toBe(false);

    await showView(page, VIEW_BUTTONS.WEEK);
    await removeAttribute(timeGridColumn(page, TARGET_ISO), DATE_ATTRIBUTE);
    expect(await dispatchDrag(page.locator(UNDATED_COLUMN_SELECTOR), DRAG_EVENT_TYPES.DROP, { data: UNKNOWN_PAYLOAD })).toBe(false);
    expect(await fetchEvents(page)).toEqual(eventsBefore);
  });
});
