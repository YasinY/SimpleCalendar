import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DatePicker } from '@renderer/dialogs/datePicker/DatePicker';
import { attachDatePickers } from '@renderer/dialogs/datePicker/attachDatePickers';
import { TRANSITION_DATASET_KEY, TRANSITION_DIRECTIONS } from '@renderer/constants';
import { mountIndexDocument } from '@tests/support/indexDocument';

const NOW = new Date(2026, 8, 16, 10, 0, 0, 0);
const TODAY_ISO = '2026-09-16';
const SELECTED_ISO = '2026-09-18';
const MIN_ISO = '2026-09-10';
const BEFORE_MIN_ISO = '2026-09-09';
const OUTSIDE_ISO = '2026-08-31';
const NOVEMBER_ISO = '2026-11-05';
const EMPTY = '';
const OPEN_STATE = 'open';
const CLOSED_STATE = 'closed';
const ESCAPE_KEY = 'Escape';
const ENTER_KEY = 'Enter';
const WEEKDAY_COUNT = 7;
const SEPTEMBER_CELL_COUNT = 35;
const DATE_FIELD_COUNT = 2;
const START_VIEW_TRANSITION = 'startViewTransition';

const SELECTORS = {
  FIELD: '[data-date-field]',
  INPUT: 'input[type="date"]',
  TRIGGER: '[data-date-picker-trigger]',
  POPOVER: '[data-date-picker]',
  TITLE: '.date-picker__title',
  WEEKDAY: '.date-picker__weekday',
  DAY: '.date-picker__day',
  PREVIOUS: '[aria-label="Vorheriger Monat"]',
  NEXT: '[aria-label="Nächster Monat"]',
  ACTION: '.date-picker__action'
} as const;

const CLASSES = {
  OUTSIDE: 'date-picker__day--outside',
  TODAY: 'date-picker__day--today',
  SELECTED: 'date-picker__day--selected'
} as const;

const TITLES = { SEPTEMBER: 'September 2026', OCTOBER: 'Oktober 2026', AUGUST: 'August 2026', NOVEMBER: 'November 2026' } as const;
const ACTION_INDEX = { CLEAR: 0, TODAY: 1 } as const;

interface Fixture {
  field: HTMLElement;
  input: HTMLInputElement;
  trigger: HTMLButtonElement;
  popover: HTMLElement;
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(selector);
  return element;
}

function createFixture(): Fixture {
  const field = query<HTMLElement>(document, SELECTORS.FIELD);
  new DatePicker(field);
  return {
    field,
    input: query(field, SELECTORS.INPUT),
    trigger: query(field, SELECTORS.TRIGGER),
    popover: query(field, SELECTORS.POPOVER)
  };
}

function toggle(popover: HTMLElement, newState: string): void {
  popover.dispatchEvent(Object.assign(new Event('toggle'), { newState }));
}

function openPicker(fixture: Fixture): void {
  toggle(fixture.popover, OPEN_STATE);
}

function dayButton(popover: HTMLElement, isoDate: string): HTMLButtonElement {
  return query(popover, SELECTORS.DAY + '[data-date="' + isoDate + '"]');
}

function title(popover: HTMLElement): string | null {
  return query<HTMLElement>(popover, SELECTORS.TITLE).textContent;
}

function action(popover: HTMLElement, index: number): HTMLButtonElement {
  return popover.querySelectorAll<HTMLButtonElement>(SELECTORS.ACTION)[index];
}

function recordEvents(input: HTMLInputElement): string[] {
  const events: string[] = [];
  input.addEventListener('input', () => events.push('input'));
  input.addEventListener('change', () => events.push('change'));
  return events;
}

describe('DatePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mountIndexDocument();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the month of the selected value with weekdays, markers and disabled days before the minimum', () => {
    const fixture = createFixture();
    fixture.input.value = SELECTED_ISO;
    fixture.input.min = MIN_ISO;

    openPicker(fixture);

    const { popover } = fixture;
    expect(title(popover)).toBe(TITLES.SEPTEMBER);
    expect(popover.querySelectorAll(SELECTORS.WEEKDAY)).toHaveLength(WEEKDAY_COUNT);
    expect(popover.querySelectorAll(SELECTORS.DAY)).toHaveLength(SEPTEMBER_CELL_COUNT);
    expect(dayButton(popover, SELECTED_ISO).classList.contains(CLASSES.SELECTED)).toBe(true);
    expect(dayButton(popover, TODAY_ISO).classList.contains(CLASSES.TODAY)).toBe(true);
    expect(dayButton(popover, OUTSIDE_ISO).classList.contains(CLASSES.OUTSIDE)).toBe(true);
    expect(dayButton(popover, BEFORE_MIN_ISO).disabled).toBe(true);
    expect(dayButton(popover, MIN_ISO).disabled).toBe(false);
    expect(document.activeElement).toBe(popover);
  });

  it('starts at the minimum month without a value and at the current month without both', () => {
    const fixture = createFixture();
    fixture.input.min = NOVEMBER_ISO;
    openPicker(fixture);
    expect(title(fixture.popover)).toBe(TITLES.NOVEMBER);

    fixture.input.min = EMPTY;
    openPicker(fixture);
    expect(title(fixture.popover)).toBe(TITLES.SEPTEMBER);
    expect(fixture.popover.querySelectorAll<HTMLButtonElement>(SELECTORS.DAY)[0].disabled).toBe(false);
  });

  it('navigates to the next and previous month', () => {
    const fixture = createFixture();
    openPicker(fixture);

    query<HTMLButtonElement>(fixture.popover, SELECTORS.NEXT).click();
    expect(title(fixture.popover)).toBe(TITLES.OCTOBER);

    query<HTMLButtonElement>(fixture.popover, SELECTORS.PREVIOUS).click();
    query<HTMLButtonElement>(fixture.popover, SELECTORS.PREVIOUS).click();
    expect(title(fixture.popover)).toBe(TITLES.AUGUST);
  });

  it('slides the month grid with a picker specific view transition direction', () => {
    const fixture = createFixture();
    openPicker(fixture);
    const directions: (string | undefined)[] = [];
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    Object.defineProperty(document, START_VIEW_TRANSITION, {
      value: vi.fn((update: () => void) => {
        directions.push(document.documentElement.dataset[TRANSITION_DATASET_KEY]);
        update();
        return { finished: Promise.resolve() };
      }),
      configurable: true
    });

    query<HTMLButtonElement>(fixture.popover, SELECTORS.NEXT).click();
    query<HTMLButtonElement>(fixture.popover, SELECTORS.PREVIOUS).click();

    expect(directions).toEqual([TRANSITION_DIRECTIONS.PICKER_FORWARD, TRANSITION_DIRECTIONS.PICKER_BACKWARD]);
    expect(title(fixture.popover)).toBe(TITLES.SEPTEMBER);
    Reflect.deleteProperty(document, START_VIEW_TRANSITION);
  });

  it('selects a day, notifies the input, closes the popover and refocuses the trigger', () => {
    const fixture = createFixture();
    const hidePopover = vi.fn();
    Object.assign(fixture.popover, { hidePopover });
    const events = recordEvents(fixture.input);
    openPicker(fixture);

    dayButton(fixture.popover, SELECTED_ISO).click();

    expect(fixture.input.value).toBe(SELECTED_ISO);
    expect(events).toEqual(['input', 'change']);
    expect(hidePopover).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(fixture.trigger);
  });

  it('closes without the popover api when it is unavailable', () => {
    const fixture = createFixture();
    openPicker(fixture);

    expect(() => dayButton(fixture.popover, SELECTED_ISO).click()).not.toThrow();
    expect(fixture.input.value).toBe(SELECTED_ISO);
  });

  it('clears the value and jumps to today through the footer actions', () => {
    const fixture = createFixture();
    fixture.input.value = SELECTED_ISO;
    openPicker(fixture);

    action(fixture.popover, ACTION_INDEX.CLEAR).click();
    expect(fixture.input.value).toBe(EMPTY);

    openPicker(fixture);
    action(fixture.popover, ACTION_INDEX.TODAY).click();
    expect(fixture.input.value).toBe(TODAY_ISO);
  });

  it('ignores toggle events that do not open the popover', () => {
    const fixture = createFixture();

    toggle(fixture.popover, CLOSED_STATE);

    expect(fixture.popover.childElementCount).toBe(0);
  });

  it('keeps escape inside the popover and returns focus to the trigger', () => {
    const fixture = createFixture();
    openPicker(fixture);
    const documentKeydown = vi.fn();
    document.addEventListener('keydown', documentKeydown);

    fixture.popover.dispatchEvent(new KeyboardEvent('keydown', { key: ENTER_KEY, bubbles: true }));
    fixture.popover.dispatchEvent(new KeyboardEvent('keydown', { key: ESCAPE_KEY, bubbles: true }));

    expect(documentKeydown).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(fixture.trigger);
    document.removeEventListener('keydown', documentKeydown);
  });

  it('attaches a picker to every date field', () => {
    expect(attachDatePickers(document.body)).toHaveLength(DATE_FIELD_COUNT);
  });
});
