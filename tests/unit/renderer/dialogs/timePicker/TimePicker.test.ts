import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimePicker } from '@renderer/dialogs/timePicker/TimePicker';
import { attachTimePickers } from '@renderer/dialogs/timePicker/attachTimePickers';
import { mountIndexDocument } from '@tests/support/indexDocument';

const EMPTY = '';
const OPEN_STATE = 'open';
const CLOSED_STATE = 'closed';
const ESCAPE_KEY = 'Escape';
const ENTER_KEY = 'Enter';
const HOUR_COUNT = 24;
const MINUTE_COUNT = 12;
const TIME_FIELD_COUNT = 2;
const COLUMN_INDEX = { HOURS: 0, MINUTES: 1 } as const;
const TIMES = { INITIAL: '09:00', QUARTER_PAST_NINE: '09:15', AFTERNOON_HOUR: '14:00', AFTERNOON: '14:30', FALLBACK_HOUR: '09:30', QUARTER: '10:15' } as const;
const VALUES = { NINE: '9', FOURTEEN: '14', ZERO: '0', THIRTY: '30', FIFTEEN: '15' } as const;
const LABELS = { NINE: '09', TEN: '10', ZERO: '00', FOURTEEN: '14', FIFTEEN: '15' } as const;
const TRUE = 'true';
const FALSE = 'false';

const SELECTORS = {
  FIELD: '[data-time-field]',
  INPUT: 'input[type="time"]',
  TRIGGER: '[data-time-picker-trigger]',
  POPOVER: '[data-time-picker]',
  COLUMN: '.time-picker__column',
  OPTION: '.time-picker__option',
  SELECTED: '.time-picker__option--selected'
} as const;

interface Fixture {
  picker: TimePicker;
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
  return {
    picker: new TimePicker(field),
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

function column(popover: HTMLElement, index: number): HTMLElement {
  return popover.querySelectorAll<HTMLElement>(SELECTORS.COLUMN)[index];
}

function option(popover: HTMLElement, columnIndex: number, value: string): HTMLButtonElement {
  return query(column(popover, columnIndex), SELECTORS.OPTION + '[data-value="' + value + '"]');
}

function selectedLabels(popover: HTMLElement): (string | null)[] {
  return Array.from(popover.querySelectorAll(SELECTORS.SELECTED), (element) => element.textContent);
}

function recordEvents(input: HTMLInputElement): string[] {
  const events: string[] = [];
  input.addEventListener('input', () => events.push('input'));
  input.addEventListener('change', () => events.push('change'));
  return events;
}

describe('TimePicker', () => {
  beforeEach(() => {
    mountIndexDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders hour and minute columns with the current value selected', () => {
    const fixture = createFixture();
    fixture.input.value = TIMES.INITIAL;

    openPicker(fixture);

    const { popover } = fixture;
    expect(column(popover, COLUMN_INDEX.HOURS).querySelectorAll(SELECTORS.OPTION)).toHaveLength(HOUR_COUNT);
    expect(column(popover, COLUMN_INDEX.MINUTES).querySelectorAll(SELECTORS.OPTION)).toHaveLength(MINUTE_COUNT);
    expect(selectedLabels(popover)).toEqual([LABELS.NINE, LABELS.ZERO]);
    expect(option(popover, COLUMN_INDEX.HOURS, VALUES.NINE).getAttribute('aria-selected')).toBe(TRUE);
    expect(option(popover, COLUMN_INDEX.HOURS, VALUES.FOURTEEN).getAttribute('aria-selected')).toBe(FALSE);
    expect(document.activeElement).toBe(popover);
  });

  it('selects nothing without a value and leaves off-step minutes unselected', () => {
    const fixture = createFixture();
    fixture.input.value = EMPTY;
    openPicker(fixture);
    expect(selectedLabels(fixture.popover)).toEqual([]);

    fixture.input.value = TIMES.QUARTER;
    openPicker(fixture);
    expect(selectedLabels(fixture.popover)).toEqual([LABELS.TEN, LABELS.FIFTEEN]);
  });

  it('keeps the popover open after picking an hour and moves the selection', () => {
    const fixture = createFixture();
    const hidePopover = vi.fn();
    Object.assign(fixture.popover, { hidePopover });
    fixture.input.value = TIMES.INITIAL;
    const events = recordEvents(fixture.input);
    openPicker(fixture);

    option(fixture.popover, COLUMN_INDEX.HOURS, VALUES.FOURTEEN).click();

    expect(fixture.input.value).toBe(TIMES.AFTERNOON_HOUR);
    expect(events).toEqual(['input', 'change']);
    expect(selectedLabels(fixture.popover)).toEqual([LABELS.FOURTEEN, LABELS.ZERO]);
    expect(hidePopover).not.toHaveBeenCalled();
  });

  it('closes after picking a minute and refocuses the trigger', () => {
    const fixture = createFixture();
    const hidePopover = vi.fn();
    Object.assign(fixture.popover, { hidePopover });
    fixture.input.value = TIMES.AFTERNOON_HOUR;
    openPicker(fixture);

    option(fixture.popover, COLUMN_INDEX.MINUTES, VALUES.THIRTY).click();

    expect(fixture.input.value).toBe(TIMES.AFTERNOON);
    expect(hidePopover).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(fixture.trigger);
  });

  it('falls back to the default hour and to zero minutes when the input is empty', () => {
    const fixture = createFixture();
    fixture.input.value = EMPTY;
    openPicker(fixture);
    option(fixture.popover, COLUMN_INDEX.MINUTES, VALUES.THIRTY).click();
    expect(fixture.input.value).toBe(TIMES.FALLBACK_HOUR);

    fixture.input.value = EMPTY;
    openPicker(fixture);
    option(fixture.popover, COLUMN_INDEX.HOURS, VALUES.FOURTEEN).click();
    expect(fixture.input.value).toBe(TIMES.AFTERNOON_HOUR);
  });

  it('closes without the popover api when it is unavailable', () => {
    const fixture = createFixture();
    openPicker(fixture);

    expect(() => option(fixture.popover, COLUMN_INDEX.MINUTES, VALUES.FIFTEEN).click()).not.toThrow();
    expect(fixture.input.value).toBe(TIMES.QUARTER_PAST_NINE);
  });

  it('disables and enables the input together with the trigger', () => {
    const fixture = createFixture();

    fixture.picker.disabled = true;
    expect(fixture.input.disabled).toBe(true);
    expect(fixture.trigger.disabled).toBe(true);

    fixture.picker.disabled = false;
    expect(fixture.input.disabled).toBe(false);
    expect(fixture.trigger.disabled).toBe(false);
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

  it('attaches a picker to every time field', () => {
    expect(attachTimePickers(document.body)).toHaveLength(TIME_FIELD_COUNT);
  });
});
