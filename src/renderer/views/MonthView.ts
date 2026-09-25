import {
  CSS_CLASSES,
  DATASET_KEYS,
  EVENT_DURATION_CLASS_PREFIX,
  GRID_WEEK_CLASS_PREFIX,
  HOLIDAY_NAME_SEPARATOR,
  MIN_STRETCHED_DURATION_STEPS,
  WEEKDAY_LABELS
} from '@renderer/constants';
import { getDurationSteps } from '@renderer/date/dateUtils';
import { closestElement, createElement, createTitledElement } from '@renderer/dom/elements';
import { makeDraggable } from '@renderer/dragDrop/dragTransfer';
import { resolveDropDate } from '@renderer/dragDrop/dropDate';
import { DropZoneTracker } from '@renderer/dragDrop/DropZoneTracker';
import { isSingleDay, sortSegmentsByStart } from '@renderer/events/daySegments';
import { toEventKey } from '@renderer/events/eventKey';
import { decorateEventPill } from '@renderer/events/eventPill';
import type { MonthCell } from '@renderer/date/monthCell';
import type { MonthGrid } from '@renderer/date/monthGrid';
import type { DaySegment } from '@renderer/events/daySegment';
import type { HolidayMap } from '@renderer/holidays/holidayDates';
import type { MonthRenderer } from './monthRenderer';
import type { MonthViewHandlers } from './monthViewHandlers';
import type { SegmentsByDate } from './segmentsByDate';
import type { CalendarEvent } from '@shared/calendarEvent';

const DAY_SELECTOR = '.' + CSS_CLASSES.DAY;
const EVENT_SELECTOR = '.' + CSS_CLASSES.EVENT;
const KEEP_TIME = null;
const EMPTY_DATE = '';

export class MonthView implements MonthRenderer {
  readonly element: HTMLElement;
  readonly #weekdayElement: HTMLElement;
  readonly #gridElement: HTMLElement;
  readonly #handlers: MonthViewHandlers;

  constructor(handlers: MonthViewHandlers) {
    this.#handlers = handlers;
    this.#weekdayElement = createElement('div', CSS_CLASSES.WEEKDAYS);
    this.#gridElement = createElement('div', CSS_CLASSES.GRID);
    this.element = createElement('div', CSS_CLASSES.MONTH_VIEW);
    this.element.append(this.#weekdayElement, this.#gridElement);
    this.#renderWeekdays();
    this.#bindInteractions();
  }

  render({ cells, weekCount }: MonthGrid, segmentsByDate: SegmentsByDate, holidaysByDate: HolidayMap): void {
    this.#applyWeekCount(weekCount);
    const fragment = document.createDocumentFragment();
    for (const cell of cells) {
      const segments = segmentsByDate.get(cell.iso) ?? [];
      const holidayNames = holidaysByDate.get(cell.iso) ?? [];
      fragment.append(this.#createDayCell(cell, segments, holidayNames));
    }
    this.#gridElement.replaceChildren(fragment);
  }

  #applyWeekCount(weekCount: number): void {
    const classList = this.#gridElement.classList;
    for (const existing of [...classList]) {
      if (existing.startsWith(GRID_WEEK_CLASS_PREFIX)) classList.remove(existing);
    }
    classList.add(GRID_WEEK_CLASS_PREFIX + weekCount);
  }

  #renderWeekdays(): void {
    const fragment = document.createDocumentFragment();
    for (const label of WEEKDAY_LABELS) {
      fragment.append(createElement('div', CSS_CLASSES.WEEKDAY, label));
    }
    this.#weekdayElement.replaceChildren(fragment);
  }

  #bindInteractions(): void {
    const gridElement = this.#gridElement;
    gridElement.addEventListener('click', (domEvent) => {
      const eventElement = closestElement(domEvent.target, EVENT_SELECTOR);
      if (!eventElement) return;
      this.#handlers.onEventActivate(eventElement.dataset[DATASET_KEYS.EVENT_KEY] ?? EMPTY_DATE);
    });

    gridElement.addEventListener('dblclick', (domEvent) => {
      if (closestElement(domEvent.target, EVENT_SELECTOR)) return;
      const dayElement = closestElement(domEvent.target, DAY_SELECTOR);
      if (!dayElement) return;
      this.#handlers.onDayActivate(dayElement.dataset[DATASET_KEYS.DATE] ?? EMPTY_DATE);
    });

    new DropZoneTracker(gridElement, {
      zoneSelector: DAY_SELECTOR,
      highlightClass: CSS_CLASSES.DROP_TARGET,
      onDrop: (payload, dayElement) => {
        const date = resolveDropDate(dayElement.dataset[DATASET_KEYS.DATE] ?? EMPTY_DATE, payload.dayOffset);
        this.#handlers.onEventDrop(payload.eventKey, { date });
      }
    });
  }

  #createDayCell(cell: MonthCell, segments: DaySegment[], holidayNames: string[]): HTMLElement {
    const dayElement = createElement('div', CSS_CLASSES.DAY);
    const classList = dayElement.classList;
    dayElement.dataset[DATASET_KEYS.DATE] = cell.iso;
    if (!cell.isCurrentMonth) classList.add(CSS_CLASSES.DAY_OUTSIDE);
    if (cell.isToday) classList.add(CSS_CLASSES.DAY_TODAY);

    const header = createElement('div', CSS_CLASSES.DAY_HEADER);
    if (holidayNames.length > 0) {
      classList.add(CSS_CLASSES.DAY_HOLIDAY);
      header.append(createTitledElement('div', CSS_CLASSES.DAY_HOLIDAY_NAME, holidayNames.join(HOLIDAY_NAME_SEPARATOR)));
    }
    header.append(createElement('div', CSS_CLASSES.DAY_NUMBER, String(cell.dayNumber)));
    dayElement.append(header);

    const eventList = createElement('div', CSS_CLASSES.DAY_EVENTS);
    for (const segment of sortSegmentsByStart(segments)) {
      eventList.append(this.#createEventPill(segment));
    }
    dayElement.append(eventList);
    return dayElement;
  }

  #createEventPill(segment: DaySegment): HTMLButtonElement {
    const pill = decorateEventPill(createElement('button', CSS_CLASSES.EVENT), segment);
    if (isSingleDay(segment)) this.#applyDurationClass(pill, segment.event);
    makeDraggable(pill, () => ({ eventKey: toEventKey(segment.event), dayOffset: segment.dayOffset, offsetMinutes: KEEP_TIME }));
    return pill;
  }

  #applyDurationClass(pill: HTMLButtonElement, event: CalendarEvent): void {
    const durationSteps = getDurationSteps(event);
    if (durationSteps >= MIN_STRETCHED_DURATION_STEPS) pill.classList.add(EVENT_DURATION_CLASS_PREFIX + durationSteps);
  }
}
