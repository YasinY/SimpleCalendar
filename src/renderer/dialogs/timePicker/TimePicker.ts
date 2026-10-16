import {
  CENTER_DIVISOR,
  FALLBACK_HOUR,
  FALLBACK_MINUTE,
  HOUR_STEP,
  MINUTE_STEP,
  NO_TIME,
  TIME_PICKER_CLASSES,
  TIME_PICKER_LABELS,
  TIME_PICKER_SELECTORS,
  TIME_VALUE_DATASET_KEY
} from './timePickerConstants';
import { PopoverField } from '../popover/PopoverField';
import { HOURS_PER_DAY, MINUTES_PER_HOUR } from '@renderer/constants';
import { formatMinutesOfDay, padTimePart, toMinutesOfDay } from '@renderer/date/dateUtils';
import { createElement } from '@renderer/dom/elements';
import type { TimeParts } from './timeParts';

const BUTTON_TYPE = 'button';
const LISTBOX_ROLE = 'listbox';
const OPTION_ROLE = 'option';
const ARIA_LABEL = 'aria-label';
const ARIA_SELECTED = 'aria-selected';

function range(limit: number, step: number): number[] {
  return Array.from({ length: Math.ceil(limit / step) }, (_, index) => index * step);
}

function scrollToCenter(column: HTMLElement, option: HTMLElement): void {
  column.scrollTop = option.offsetTop - (column.clientHeight - option.offsetHeight) / CENTER_DIVISOR;
}

export class TimePicker extends PopoverField {
  constructor(field: HTMLElement) {
    super(field, TIME_PICKER_SELECTORS);
  }

  set disabled(disabled: boolean) {
    this.input.disabled = disabled;
    this.trigger.disabled = disabled;
  }

  protected open(): void {
    const selected = this.#selectedParts();
    const hours = this.#buildColumn(range(HOURS_PER_DAY, HOUR_STEP), selected?.hour, TIME_PICKER_LABELS.HOURS, (hour, column) => this.#selectHour(hour, column));
    const minutes = this.#buildColumn(range(MINUTES_PER_HOUR, MINUTE_STEP), selected?.minute, TIME_PICKER_LABELS.MINUTES, (minute) => this.#selectMinute(minute));
    this.popover.replaceChildren(hours, minutes);
    this.popover.focus();
  }

  #selectedParts(): TimeParts | null {
    const value = this.input.value;
    if (value === NO_TIME) return null;
    const minutesOfDay = toMinutesOfDay(value);
    return { hour: Math.floor(minutesOfDay / MINUTES_PER_HOUR), minute: minutesOfDay % MINUTES_PER_HOUR };
  }

  #buildColumn(values: number[], selected: number | undefined, label: string, onPick: (value: number, column: HTMLElement) => void): HTMLElement {
    const column = createElement('div', TIME_PICKER_CLASSES.COLUMN);
    column.setAttribute('role', LISTBOX_ROLE);
    column.setAttribute(ARIA_LABEL, label);
    column.append(...values.map((value) => this.#buildOption(value, () => onPick(value, column))));
    this.#markSelected(column, selected);
    return column;
  }

  #buildOption(value: number, onPick: () => void): HTMLButtonElement {
    const option = createElement('button', TIME_PICKER_CLASSES.OPTION, padTimePart(value));
    option.type = BUTTON_TYPE;
    option.setAttribute('role', OPTION_ROLE);
    option.dataset[TIME_VALUE_DATASET_KEY] = String(value);
    option.addEventListener('click', onPick);
    return option;
  }

  #markSelected(column: HTMLElement, selected: number | undefined): void {
    for (const option of column.querySelectorAll<HTMLElement>('.' + TIME_PICKER_CLASSES.OPTION)) {
      const isSelected = option.dataset[TIME_VALUE_DATASET_KEY] === String(selected);
      option.classList.toggle(TIME_PICKER_CLASSES.OPTION_SELECTED, isSelected);
      option.setAttribute(ARIA_SELECTED, String(isSelected));
      if (isSelected) scrollToCenter(column, option);
    }
  }

  #selectHour(hour: number, column: HTMLElement): void {
    const current = this.#selectedParts();
    this.#commitParts({ hour, minute: current?.minute ?? FALLBACK_MINUTE });
    this.#markSelected(column, hour);
  }

  #selectMinute(minute: number): void {
    const current = this.#selectedParts();
    this.#commitParts({ hour: current?.hour ?? FALLBACK_HOUR, minute });
    this.close();
  }

  #commitParts(parts: TimeParts): void {
    this.commit(formatMinutesOfDay(parts.hour * MINUTES_PER_HOUR + parts.minute));
  }
}
