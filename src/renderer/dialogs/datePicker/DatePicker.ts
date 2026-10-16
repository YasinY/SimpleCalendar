import {
  DATE_DATASET_KEY,
  DATE_PICKER_CLASSES,
  DATE_PICKER_GLYPHS,
  DATE_PICKER_LABELS,
  DATE_PICKER_SELECTORS,
  NEXT_MONTH_STEP,
  PREVIOUS_MONTH_STEP,
  TITLE_SEPARATOR
} from './datePickerConstants';
import { PopoverField } from '../popover/PopoverField';
import { NO_DATE, TRANSITION_DIRECTIONS, WEEKDAY_LABELS, type TransitionDirection } from '@renderer/constants';
import { addMonths, buildMonthGrid, fromIsoDate, getMonthTitle, startOfMonth, toIsoDate } from '@renderer/date/dateUtils';
import { createElement } from '@renderer/dom/elements';
import { runWithTransition } from '@renderer/dom/transitions';
import type { MonthCell } from '@renderer/date/monthCell';

const BUTTON_TAG = 'button';
const BUTTON_TYPE = 'button';

function createButton(className: string, text: string, label?: string): HTMLButtonElement {
  const button = createElement(BUTTON_TAG, className, text);
  button.type = BUTTON_TYPE;
  if (label !== undefined) button.setAttribute('aria-label', label);
  return button;
}

export class DatePicker extends PopoverField {
  #viewMonth: Date = startOfMonth(new Date());

  constructor(field: HTMLElement) {
    super(field, DATE_PICKER_SELECTORS);
  }

  protected open(): void {
    this.#viewMonth = startOfMonth(this.#initialDate());
    this.#render();
    this.popover.focus();
  }

  #initialDate(): Date {
    const anchor = this.input.value || this.input.min;
    return anchor ? fromIsoDate(anchor) : new Date();
  }

  #render(): void {
    this.popover.replaceChildren(this.#buildHeader(), this.#buildWeekdays(), this.#buildGrid(), this.#buildFooter());
  }

  #buildHeader(): HTMLElement {
    const header = createElement('div', DATE_PICKER_CLASSES.HEADER);
    const { month, year } = getMonthTitle(this.#viewMonth);
    const title = createElement('span', DATE_PICKER_CLASSES.TITLE, month + TITLE_SEPARATOR + year);
    const previous = createButton(DATE_PICKER_CLASSES.NAV, DATE_PICKER_GLYPHS.PREVIOUS, DATE_PICKER_LABELS.PREVIOUS_MONTH);
    const next = createButton(DATE_PICKER_CLASSES.NAV, DATE_PICKER_GLYPHS.NEXT, DATE_PICKER_LABELS.NEXT_MONTH);
    previous.addEventListener('click', () => this.#shiftMonth(PREVIOUS_MONTH_STEP, TRANSITION_DIRECTIONS.PICKER_BACKWARD));
    next.addEventListener('click', () => this.#shiftMonth(NEXT_MONTH_STEP, TRANSITION_DIRECTIONS.PICKER_FORWARD));
    header.append(title, previous, next);
    return header;
  }

  #buildWeekdays(): HTMLElement {
    const row = createElement('div', DATE_PICKER_CLASSES.WEEKDAYS);
    row.append(...WEEKDAY_LABELS.map((label) => createElement('span', DATE_PICKER_CLASSES.WEEKDAY, label)));
    return row;
  }

  #buildGrid(): HTMLElement {
    const grid = createElement('div', DATE_PICKER_CLASSES.GRID);
    const { cells } = buildMonthGrid(this.#viewMonth, new Date());
    grid.append(...cells.map((cell) => this.#buildDay(cell)));
    return grid;
  }

  #buildDay(cell: MonthCell): HTMLButtonElement {
    const button = createButton(DATE_PICKER_CLASSES.DAY, String(cell.dayNumber));
    button.dataset[DATE_DATASET_KEY] = cell.iso;
    button.classList.toggle(DATE_PICKER_CLASSES.DAY_OUTSIDE, !cell.isCurrentMonth);
    button.classList.toggle(DATE_PICKER_CLASSES.DAY_TODAY, cell.isToday);
    button.classList.toggle(DATE_PICKER_CLASSES.DAY_SELECTED, cell.iso === this.input.value);
    button.disabled = this.#isBeforeMinimum(cell.iso);
    button.addEventListener('click', () => this.#select(cell.iso));
    return button;
  }

  #buildFooter(): HTMLElement {
    const footer = createElement('div', DATE_PICKER_CLASSES.FOOTER);
    const clear = createButton(DATE_PICKER_CLASSES.ACTION, DATE_PICKER_LABELS.CLEAR);
    const today = createButton(DATE_PICKER_CLASSES.ACTION, DATE_PICKER_LABELS.TODAY);
    clear.addEventListener('click', () => this.#select(NO_DATE));
    today.addEventListener('click', () => this.#select(toIsoDate(new Date())));
    footer.append(clear, today);
    return footer;
  }

  #isBeforeMinimum(isoDate: string): boolean {
    const minimum = this.input.min;
    return minimum !== NO_DATE && isoDate < minimum;
  }

  #shiftMonth(delta: number, direction: TransitionDirection): void {
    this.#viewMonth = addMonths(this.#viewMonth, delta);
    runWithTransition(direction, () => this.#render());
  }

  #select(isoDate: string): void {
    this.commit(isoDate);
    this.close();
  }
}
