import {
  CSS_CLASSES,
  CSS_VARIABLES,
  CURRENT_TIME_TICK_MS,
  DATASET_KEYS,
  HOLIDAY_NAME_SEPARATOR,
  HOURS_PER_DAY,
  INITIAL_SCROLL_HOUR,
  MINUTES_PER_HOUR,
  WEEKDAY_LABELS
} from '../constants';
import { formatMinutesOfDay, getMinutesOfDay } from '../date/dateUtils';
import { closestElement, createElement, createTitledElement } from '../dom/elements';
import { makeDraggable } from '../dragDrop/dragTransfer';
import { DropZoneTracker } from '../dragDrop/DropZoneTracker';
import { layoutDayEvents } from '../events/eventLayout';
import { decorateEventPill } from '../events/eventPill';
import { minutesFromPointer, snapMinutes } from './timeGridGeometry';
import type { DayColumn } from '../date/dayColumn';
import type { DayColumnLayout } from '../date/dayColumnLayout';
import type { EventPlacement } from '../events/eventLayout';
import type { HolidayMap } from '../holidays/holidayDates';
import type { EventsByDate } from './eventsByDate';
import type { TimeGridHandlers } from './timeGridHandlers';
import type { TimeGridRenderer } from './timeGridRenderer';
import type { CalendarEvent } from '../../shared/calendarEvent';

const COLUMN_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_COLUMN;
const EVENT_SELECTOR = '.' + CSS_CLASSES.EVENT;
const FIRST_LABELED_HOUR = 1;
const EMPTY_DATE = '';

export class TimeGridView implements TimeGridRenderer {
  readonly element: HTMLElement;
  readonly #headerElement: HTMLElement;
  readonly #bodyElement: HTMLElement;
  readonly #hoursElement: HTMLElement;
  readonly #columnsElement: HTMLElement;
  readonly #handlers: TimeGridHandlers;
  #nowLine: HTMLElement | null = null;
  #hasScrolledInitially = false;

  constructor(handlers: TimeGridHandlers) {
    this.#handlers = handlers;
    this.#headerElement = createElement('div', CSS_CLASSES.TIME_GRID_HEADER);
    this.#hoursElement = createElement('div', CSS_CLASSES.TIME_GRID_HOURS);
    this.#columnsElement = createElement('div', CSS_CLASSES.TIME_GRID_COLUMNS);
    this.#bodyElement = createElement('div', CSS_CLASSES.TIME_GRID_BODY);
    this.#bodyElement.append(this.#hoursElement, this.#columnsElement);
    this.element = createElement('div', CSS_CLASSES.TIME_GRID);
    this.element.append(this.#headerElement, this.#bodyElement);
    this.#renderHourLabels();
    this.#bindInteractions();
  }

  start(): void {
    setInterval(() => this.#updateNowLine(), CURRENT_TIME_TICK_MS);
  }

  render({ columns }: DayColumnLayout, eventsByDate: EventsByDate, holidaysByDate: HolidayMap): void {
    this.element.style.setProperty(CSS_VARIABLES.DAY_COUNT, String(columns.length));
    this.#nowLine = null;

    const headerFragment = document.createDocumentFragment();
    headerFragment.append(createElement('div', CSS_CLASSES.TIME_GRID_CORNER));
    const columnFragment = document.createDocumentFragment();

    for (const column of columns) {
      const holidayNames = holidaysByDate.get(column.iso) ?? [];
      headerFragment.append(this.#createDayHeader(column, holidayNames));
      columnFragment.append(this.#createDayColumn(column, eventsByDate.get(column.iso) ?? [], holidayNames));
    }

    this.#headerElement.replaceChildren(headerFragment);
    this.#columnsElement.replaceChildren(columnFragment);
    this.#updateNowLine();
    this.#scrollToWorkingHours();
  }

  #renderHourLabels(): void {
    const fragment = document.createDocumentFragment();
    for (let hour = FIRST_LABELED_HOUR; hour < HOURS_PER_DAY; hour += 1) {
      const label = createElement('div', CSS_CLASSES.TIME_GRID_HOUR, formatMinutesOfDay(hour * MINUTES_PER_HOUR));
      label.style.setProperty(CSS_VARIABLES.HOUR, String(hour));
      fragment.append(label);
    }
    this.#hoursElement.replaceChildren(fragment);
  }

  #bindInteractions(): void {
    const columnsElement = this.#columnsElement;
    columnsElement.addEventListener('click', (domEvent) => {
      const eventElement = closestElement(domEvent.target, EVENT_SELECTOR);
      if (!eventElement) return;
      this.#handlers.onEventActivate(eventElement.dataset[DATASET_KEYS.EVENT_ID] ?? EMPTY_DATE);
    });

    columnsElement.addEventListener('dblclick', (domEvent) => {
      if (closestElement(domEvent.target, EVENT_SELECTOR)) return;
      const column = closestElement(domEvent.target, COLUMN_SELECTOR);
      if (!column) return;
      const minutes = snapMinutes(minutesFromPointer(column, domEvent.clientY));
      this.#handlers.onSlotActivate(column.dataset[DATASET_KEYS.DATE] ?? EMPTY_DATE, formatMinutesOfDay(minutes));
    });

    new DropZoneTracker(columnsElement, {
      zoneSelector: COLUMN_SELECTOR,
      highlightClass: CSS_CLASSES.DROP_TARGET,
      onDrop: (payload, column, domEvent) => {
        const startMinutes = snapMinutes(minutesFromPointer(column, domEvent.clientY) - payload.offsetMinutes);
        this.#handlers.onEventDrop(payload.eventId, { date: column.dataset[DATASET_KEYS.DATE] ?? EMPTY_DATE, startMinutes });
      }
    });
  }

  #createDayHeader(column: DayColumn, holidayNames: string[]): HTMLElement {
    const hasHoliday = holidayNames.length > 0;
    const header = createElement('div', CSS_CLASSES.TIME_GRID_DAY);
    const classList = header.classList;
    if (column.isToday) classList.add(CSS_CLASSES.TIME_GRID_DAY_TODAY);
    if (hasHoliday) classList.add(CSS_CLASSES.TIME_GRID_DAY_HOLIDAY);

    header.append(
      createElement('span', CSS_CLASSES.TIME_GRID_DAY_NAME, WEEKDAY_LABELS[column.weekdayIndex]),
      createElement('span', CSS_CLASSES.TIME_GRID_DAY_NUMBER, String(column.dayNumber))
    );

    if (hasHoliday) {
      header.append(createTitledElement('span', CSS_CLASSES.TIME_GRID_HOLIDAY_NAME, holidayNames.join(HOLIDAY_NAME_SEPARATOR)));
    }
    return header;
  }

  #createDayColumn(column: DayColumn, events: CalendarEvent[], holidayNames: string[]): HTMLElement {
    const columnElement = createElement('div', CSS_CLASSES.TIME_GRID_COLUMN);
    const classList = columnElement.classList;
    columnElement.dataset[DATASET_KEYS.DATE] = column.iso;
    if (column.isToday) classList.add(CSS_CLASSES.TIME_GRID_COLUMN_TODAY);
    if (holidayNames.length > 0) classList.add(CSS_CLASSES.TIME_GRID_COLUMN_HOLIDAY);

    for (const placement of layoutDayEvents(events)) {
      columnElement.append(this.#createEventBlock(placement));
    }

    if (column.isToday) {
      this.#nowLine = createElement('div', CSS_CLASSES.NOW_LINE);
      columnElement.append(this.#nowLine);
    }
    return columnElement;
  }

  #createEventBlock({ event, start, end, column, columnCount }: EventPlacement): HTMLButtonElement {
    const block = decorateEventPill(createElement('button', CSS_CLASSES.EVENT), event);
    block.classList.add(CSS_CLASSES.EVENT_BLOCK);
    const style = block.style;
    style.setProperty(CSS_VARIABLES.BLOCK_START, String(start));
    style.setProperty(CSS_VARIABLES.BLOCK_MINUTES, String(end - start));
    style.setProperty(CSS_VARIABLES.BLOCK_COLUMN, String(column));
    style.setProperty(CSS_VARIABLES.BLOCK_COLUMNS, String(columnCount));

    makeDraggable(block, (domEvent) => {
      const parent = block.parentElement as HTMLElement;
      const blockTop = block.getBoundingClientRect().top;
      const offsetMinutes = minutesFromPointer(parent, domEvent.clientY) - minutesFromPointer(parent, blockTop);
      return { eventId: event.id, offsetMinutes };
    });
    return block;
  }

  #updateNowLine(): void {
    if (!this.#nowLine) return;
    this.#nowLine.style.setProperty(CSS_VARIABLES.BLOCK_START, String(getMinutesOfDay(new Date())));
  }

  #scrollToWorkingHours(): void {
    if (this.#hasScrolledInitially) return;
    this.#hasScrolledInitially = true;
    requestAnimationFrame(() => {
      const hourHeight = this.#columnsElement.scrollHeight / HOURS_PER_DAY;
      this.#bodyElement.scrollTop = hourHeight * INITIAL_SCROLL_HOUR;
    });
  }
}
