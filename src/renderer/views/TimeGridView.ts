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
} from '@renderer/constants';
import { formatMinutesOfDay, getMinutesOfDay } from '@renderer/date/dateUtils';
import { closestElement, createElement, createTitledElement } from '@renderer/dom/elements';
import { makeDraggable } from '@renderer/dragDrop/dragTransfer';
import { resolveDropDate } from '@renderer/dragDrop/dropDate';
import { DropZoneTracker } from '@renderer/dragDrop/DropZoneTracker';
import { toEventKey } from '@renderer/events/eventKey';
import { layoutDaySegments } from '@renderer/events/eventLayout';
import { decorateEventPill } from '@renderer/events/eventPill';
import { minutesFromPointer, snapMinutes } from './timeGridGeometry';
import type { DayColumn } from '@renderer/date/dayColumn';
import type { DayColumnLayout } from '@renderer/date/dayColumnLayout';
import type { DragPayload } from '@renderer/dragDrop/dragPayload';
import type { DaySegment } from '@renderer/events/daySegment';
import type { EventPlacement } from '@renderer/events/eventLayout';
import type { HolidayMap } from '@renderer/holidays/holidayDates';
import type { MoveTarget } from './moveTarget';
import type { SegmentsByDate } from './segmentsByDate';
import type { TimeGridHandlers } from './timeGridHandlers';
import type { TimeGridRenderer } from './timeGridRenderer';

const COLUMN_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_COLUMN;
const ALL_DAY_CELL_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_ALL_DAY_CELL;
const EVENT_SELECTOR = '.' + CSS_CLASSES.EVENT;
const FIRST_LABELED_HOUR = 1;
const EMPTY_DATE = '';
const KEEP_TIME = null;

function isAllDay({ event }: DaySegment): boolean {
  return event.allDay;
}

function isTimed(segment: DaySegment): boolean {
  return !isAllDay(segment);
}

export class TimeGridView implements TimeGridRenderer {
  readonly element: HTMLElement;
  readonly #headerElement: HTMLElement;
  readonly #allDayElement: HTMLElement;
  readonly #bodyElement: HTMLElement;
  readonly #hoursElement: HTMLElement;
  readonly #columnsElement: HTMLElement;
  readonly #handlers: TimeGridHandlers;
  #nowLine: HTMLElement | null = null;
  #hasScrolledInitially = false;

  constructor(handlers: TimeGridHandlers) {
    this.#handlers = handlers;
    this.#headerElement = createElement('div', CSS_CLASSES.TIME_GRID_HEADER);
    this.#allDayElement = createElement('div', CSS_CLASSES.TIME_GRID_ALL_DAY);
    this.#hoursElement = createElement('div', CSS_CLASSES.TIME_GRID_HOURS);
    this.#columnsElement = createElement('div', CSS_CLASSES.TIME_GRID_COLUMNS);
    this.#bodyElement = createElement('div', CSS_CLASSES.TIME_GRID_BODY);
    this.#bodyElement.append(this.#hoursElement, this.#columnsElement);
    this.element = createElement('div', CSS_CLASSES.TIME_GRID);
    this.element.append(this.#headerElement, this.#allDayElement, this.#bodyElement);
    this.#renderHourLabels();
    this.#bindInteractions();
  }

  start(): void {
    setInterval(() => this.#updateNowLine(), CURRENT_TIME_TICK_MS);
  }

  render({ columns }: DayColumnLayout, segmentsByDate: SegmentsByDate, holidaysByDate: HolidayMap): void {
    this.element.style.setProperty(CSS_VARIABLES.DAY_COUNT, String(columns.length));
    this.#nowLine = null;

    const headerFragment = document.createDocumentFragment();
    headerFragment.append(createElement('div', CSS_CLASSES.TIME_GRID_CORNER));
    const allDayFragment = document.createDocumentFragment();
    allDayFragment.append(createElement('div', CSS_CLASSES.TIME_GRID_CORNER));
    const columnFragment = document.createDocumentFragment();

    for (const column of columns) {
      const holidayNames = holidaysByDate.get(column.iso) ?? [];
      const segments = segmentsByDate.get(column.iso) ?? [];
      headerFragment.append(this.#createDayHeader(column, holidayNames));
      allDayFragment.append(this.#createAllDayCell(column, segments.filter(isAllDay)));
      columnFragment.append(this.#createDayColumn(column, segments.filter(isTimed), holidayNames));
    }

    this.#headerElement.replaceChildren(headerFragment);
    this.#allDayElement.replaceChildren(allDayFragment);
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
    this.element.addEventListener('click', (domEvent) => {
      const eventElement = closestElement(domEvent.target, EVENT_SELECTOR);
      if (!eventElement) return;
      this.#handlers.onEventActivate(eventElement.dataset[DATASET_KEYS.EVENT_KEY] ?? EMPTY_DATE);
    });

    columnsElement.addEventListener('dblclick', (domEvent) => {
      if (closestElement(domEvent.target, EVENT_SELECTOR)) return;
      const column = closestElement(domEvent.target, COLUMN_SELECTOR);
      if (!column) return;
      const minutes = snapMinutes(minutesFromPointer(column, domEvent.clientY));
      this.#handlers.onSlotActivate(column.dataset[DATASET_KEYS.DATE] ?? EMPTY_DATE, formatMinutesOfDay(minutes));
    });

    new DropZoneTracker(this.#allDayElement, {
      zoneSelector: ALL_DAY_CELL_SELECTOR,
      highlightClass: CSS_CLASSES.DROP_TARGET,
      onDrop: (payload, cell) => this.#handlers.onEventDrop(payload.eventKey, this.#toMoveTarget(payload, cell))
    });

    new DropZoneTracker(columnsElement, {
      zoneSelector: COLUMN_SELECTOR,
      highlightClass: CSS_CLASSES.DROP_TARGET,
      onDrop: (payload, column, domEvent) => {
        const target = this.#toMoveTarget(payload, column);
        if (payload.offsetMinutes !== KEEP_TIME) target.startMinutes = snapMinutes(minutesFromPointer(column, domEvent.clientY) - payload.offsetMinutes);
        this.#handlers.onEventDrop(payload.eventKey, target);
      }
    });
  }

  #toMoveTarget(payload: DragPayload, zone: HTMLElement): MoveTarget {
    return { date: resolveDropDate(zone.dataset[DATASET_KEYS.DATE] ?? EMPTY_DATE, payload.dayOffset) };
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

  #createAllDayCell(column: DayColumn, segments: DaySegment[]): HTMLElement {
    const cell = createElement('div', CSS_CLASSES.TIME_GRID_ALL_DAY_CELL);
    cell.dataset[DATASET_KEYS.DATE] = column.iso;
    if (column.isToday) cell.classList.add(CSS_CLASSES.TIME_GRID_ALL_DAY_CELL_TODAY);
    for (const segment of segments) {
      const pill = decorateEventPill(createElement('button', CSS_CLASSES.EVENT), segment);
      makeDraggable(pill, () => ({ eventKey: toEventKey(segment.event), dayOffset: segment.dayOffset, offsetMinutes: KEEP_TIME }));
      cell.append(pill);
    }
    return cell;
  }

  #createDayColumn(column: DayColumn, segments: DaySegment[], holidayNames: string[]): HTMLElement {
    const columnElement = createElement('div', CSS_CLASSES.TIME_GRID_COLUMN);
    const classList = columnElement.classList;
    columnElement.dataset[DATASET_KEYS.DATE] = column.iso;
    if (column.isToday) classList.add(CSS_CLASSES.TIME_GRID_COLUMN_TODAY);
    if (holidayNames.length > 0) classList.add(CSS_CLASSES.TIME_GRID_COLUMN_HOLIDAY);

    for (const placement of layoutDaySegments(segments)) {
      columnElement.append(this.#createEventBlock(placement));
    }

    if (column.isToday) {
      this.#nowLine = createElement('div', CSS_CLASSES.NOW_LINE);
      columnElement.append(this.#nowLine);
    }
    return columnElement;
  }

  #createEventBlock({ segment, start, end, column, columnCount }: EventPlacement): HTMLButtonElement {
    const block = decorateEventPill(createElement('button', CSS_CLASSES.EVENT), segment);
    block.classList.add(CSS_CLASSES.EVENT_BLOCK);
    const style = block.style;
    style.setProperty(CSS_VARIABLES.BLOCK_START, String(start));
    style.setProperty(CSS_VARIABLES.BLOCK_MINUTES, String(end - start));
    style.setProperty(CSS_VARIABLES.BLOCK_COLUMN, String(column));
    style.setProperty(CSS_VARIABLES.BLOCK_COLUMNS, String(columnCount));

    makeDraggable(block, (domEvent) => ({
      eventKey: toEventKey(segment.event),
      dayOffset: segment.dayOffset,
      offsetMinutes: segment.isFirst ? this.#grabOffsetMinutes(block, domEvent.clientY) : KEEP_TIME
    }));
    return block;
  }

  #grabOffsetMinutes(block: HTMLButtonElement, pointerY: number): number {
    const parent = block.parentElement as HTMLElement;
    const blockTop = block.getBoundingClientRect().top;
    return minutesFromPointer(parent, pointerY) - minutesFromPointer(parent, blockTop);
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
