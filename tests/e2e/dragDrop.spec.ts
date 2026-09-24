import type { Locator, Page } from '@playwright/test';
import { expect, test } from './support/calendarFixture';
import {
  DROP_TARGET_CLASS,
  SELECTORS,
  TODAY_ISO,
  VIEW_BUTTONS,
  centerOf,
  collectPageErrors,
  dayCell,
  dragWithMouse,
  fetchEventByTitle,
  fetchEvents,
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
const INVALID_PAYLOAD = 'kein json';
const UNKNOWN_PAYLOAD = JSON.stringify({ eventId: 'unknown-event', offsetMinutes: 0 });

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
  ALL_DAY: 'Ganztags'
} as const;

const TIMED_EVENT = { date: TODAY_ISO, time: '09:00', endTime: '10:00', title: TITLES.TIMED };
const OPEN_EVENT = { date: TODAY_ISO, time: '09:00', title: TITLES.OPEN };
const ALL_DAY_EVENT = { date: TODAY_ISO, time: '00:00', allDay: true, title: TITLES.ALL_DAY };
const MONTH_EVENT = { date: TODAY_ISO, time: '10:00', endTime: '11:00', title: TITLES.MONTH };

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

  test('moves an all day block to another day without changing its time', async ({ calendar: { page } }) => {
    await openWeekWith(page, [ALL_DAY_EVENT], 0);
    const block = timeGridColumn(page, TODAY_ISO).locator(SELECTORS.EVENT);
    await dragBlockTo(page, block, timeGridColumn(page, TARGET_ISO), NIGHT_MINUTES);

    await expect(timeGridColumn(page, TARGET_ISO).locator(SELECTORS.EVENT_TITLE)).toHaveText(TITLES.ALL_DAY);
    const moved = await fetchEventByTitle(page, TITLES.ALL_DAY);
    expect(moved).toMatchObject({ date: TARGET_ISO, time: ALL_DAY_EVENT.time, allDay: true });
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
