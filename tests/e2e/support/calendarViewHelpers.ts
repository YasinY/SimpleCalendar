import { expect, type Locator, type Page } from '@playwright/test';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { EventInput } from '@shared/eventInput';

const MINUTES_PER_DAY = 1440;
const HALF = 2;
const SCROLL_MARGIN_PX = 120;
const DRAG_MOVE_STEPS = 5;
const ROOT_SELECTOR = 'html';
const TRANSITION_ATTRIBUTE = 'data-transition';
const ANY_VALUE = /.*/;
const WIDE_RANGE = { from: '2000-01-01', to: '2099-12-31' };

export const FROZEN_NOW = '2026-09-16T10:00:00';
export const TODAY_ISO = '2026-09-16';

export const SELECTORS = {
  MONTH_NAME: '#monthName',
  YEAR_LABEL: '#yearLabel',
  PREVIOUS: '#previousPeriod',
  NEXT: '#nextPeriod',
  TODAY: '#todayButton',
  GRID: '.grid',
  DAY: '.day',
  EVENT: '.event',
  EVENT_TITLE: '.event__title',
  EVENT_TIME: '.event__time',
  TIME_GRID_BODY: '.time-grid__body',
  TIME_GRID_COLUMNS: '.time-grid__columns',
  TIME_GRID_COLUMN: '.time-grid__column',
  ALL_DAY_CELL: '.time-grid__all-day-cell',
  DIALOG_OVERLAY: '#dialogOverlay',
  DIALOG_HEADING: '[data-dialog-heading]',
  DIALOG_TITLE: '[data-dialog-title]',
  DIALOG_TIME: '[data-dialog-time]',
  DIALOG_SUBMIT: '[data-dialog-submit]',
  DIALOG_DELETE: '[data-dialog-delete]',
  SCOPE_OVERLAY: '#scopeOverlay',
  SCOPE_OCCURRENCE: '[data-scope-occurrence]',
  SCOPE_SERIES: '[data-scope-series]',
  SCOPE_CANCEL: '[data-scope-cancel]'
} as const;

export const EVENT_CLASSES = {
  CONTINUES_BEFORE: /event--continues-before/,
  CONTINUES_AFTER: /event--continues-after/,
  RECURRING: /event--recurring/
} as const;

export const VIEW_BUTTONS = {
  MONTH: '[data-view-mode="month"]',
  WEEK: '[data-view-mode="week"]',
  DAY: '[data-view-mode="day"]'
} as const;

export const DROP_TARGET_CLASS = /drop-target/;

export async function freezeClock(page: Page, isoDateTime: string = FROZEN_NOW): Promise<void> {
  await page.clock.install({ time: new Date(isoDateTime) });
  await page.reload();
  await expect(page.locator(SELECTORS.MONTH_NAME)).not.toBeEmpty();
}

export async function seedEvents(page: Page, events: EventInput[]): Promise<void> {
  await page.evaluate(async (inputs) => {
    for (const input of inputs) await window.calendarApi.saveEvent(input);
  }, events);
}

export async function fetchEvents(page: Page): Promise<CalendarEvent[]> {
  return page.evaluate((range) => window.calendarApi.getEvents(range), WIDE_RANGE);
}

export async function fetchEventsBetween(page: Page, from: string, to: string): Promise<CalendarEvent[]> {
  return page.evaluate((range) => window.calendarApi.getEvents(range), { from, to });
}

export async function fetchEventByTitle(page: Page, title: string): Promise<CalendarEvent | undefined> {
  const events = await fetchEvents(page);
  return events.find((event) => event.title === title);
}

export function dayCell(page: Page, isoDate: string): Locator {
  return page.locator(SELECTORS.DAY + '[data-date="' + isoDate + '"]');
}

export function allDayCell(page: Page, isoDate: string): Locator {
  return page.locator(SELECTORS.ALL_DAY_CELL + '[data-date="' + isoDate + '"]');
}

export function timeGridColumn(page: Page, isoDate: string): Locator {
  return page.locator(SELECTORS.TIME_GRID_COLUMN + '[data-date="' + isoDate + '"]');
}

export async function scrollToMinutes(page: Page, minutes: number): Promise<void> {
  await page.locator(SELECTORS.TIME_GRID_BODY).evaluate((body, { fraction, margin }) => {
    body.scrollTop = body.scrollHeight * fraction - margin;
  }, { fraction: minutes / MINUTES_PER_DAY, margin: SCROLL_MARGIN_PX });
}

export async function pointAtMinutes(column: Locator, minutes: number, offsetY = 0): Promise<{ x: number; y: number }> {
  const box = await column.boundingBox();
  if (!box) throw new Error('column not rendered');
  return { x: box.x + box.width / HALF, y: box.y + (box.height * minutes) / MINUTES_PER_DAY + offsetY };
}

export async function centerOf(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('element not rendered');
  return { x: box.x + box.width / HALF, y: box.y + box.height / HALF };
}

export async function dragWithMouse(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: DRAG_MOVE_STEPS });
  await page.mouse.up();
}

export async function removeAttribute(locator: Locator, name: string): Promise<void> {
  await locator.evaluate((element, attribute) => element.removeAttribute(attribute), name);
}

export async function setAttribute(locator: Locator, name: string, value: string): Promise<void> {
  await locator.evaluate((element, { attribute, attributeValue }) => element.setAttribute(attribute, attributeValue), { attribute: name, attributeValue: value });
}

export async function readStyleVariable(locator: Locator, name: string): Promise<string> {
  return locator.evaluate((element, variable) => (element as HTMLElement).style.getPropertyValue(variable), name);
}

export async function expectClassState(locator: Locator, pattern: RegExp, present: boolean): Promise<void> {
  if (present) {
    await expect(locator).toHaveClass(pattern);
    return;
  }
  await expect(locator).not.toHaveClass(pattern);
}

export async function expectContinuation(pill: Locator, continuesBefore: boolean, continuesAfter: boolean): Promise<void> {
  await expectClassState(pill, EVENT_CLASSES.CONTINUES_BEFORE, continuesBefore);
  await expectClassState(pill, EVENT_CLASSES.CONTINUES_AFTER, continuesAfter);
}

export function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  return errors;
}

export async function reloadWithoutElement(page: Page, selector: string): Promise<void> {
  await page.addInitScript((removedSelector) => {
    document.addEventListener('readystatechange', () => document.querySelector(removedSelector)?.remove());
  }, selector);
  await page.reload();
}

export async function waitForSettledView(page: Page): Promise<void> {
  await expect(page.locator(ROOT_SELECTOR)).not.toHaveAttribute(TRANSITION_ATTRIBUTE, ANY_VALUE);
}

export async function showView(page: Page, viewButton: string): Promise<void> {
  await page.locator(viewButton).click();
  await waitForSettledView(page);
}
