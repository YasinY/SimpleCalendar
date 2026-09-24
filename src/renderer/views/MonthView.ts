import {
  CSS_CLASSES,
  DATASET_KEYS,
  EVENT_DURATION_CLASS_PREFIX,
  GRID_WEEK_CLASS_PREFIX,
  HOLIDAY_NAME_SEPARATOR,
  MIN_STRETCHED_DURATION_STEPS,
  WEEKDAY_LABELS
} from '../constants';
import { getDurationSteps, sortByTime } from '../date/dateUtils';
import { closestElement, createElement, createTitledElement } from '../dom/elements';
import { makeDraggable } from '../dragDrop/dragTransfer';
import { DropZoneTracker } from '../dragDrop/DropZoneTracker';
import { decorateEventPill } from '../events/eventPill';
import type { MonthCell } from '../date/monthCell';
import type { MonthGrid } from '../date/monthGrid';
import type { HolidayMap } from '../holidays/holidayDates';
import type { EventsByDate } from './eventsByDate';
import type { MonthRenderer } from './monthRenderer';
import type { MonthViewHandlers } from './monthViewHandlers';
import type { CalendarEvent } from '../../shared/calendarEvent';

const DAY_SELECTOR = '.' + CSS_CLASSES.DAY;
const EVENT_SELECTOR = '.' + CSS_CLASSES.EVENT;
const NO_TIME_OFFSET = 0;
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

  render({ cells, weekCount }: MonthGrid, eventsByDate: EventsByDate, holidaysByDate: HolidayMap): void {
    this.#applyWeekCount(weekCount);
    const fragment = document.createDocumentFragment();
    for (const cell of cells) {
      const events = eventsByDate.get(cell.iso) ?? [];
      const holidayNames = holidaysByDate.get(cell.iso) ?? [];
      fragment.append(this.#createDayCell(cell, events, holidayNames));
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
      this.#handlers.onEventActivate(eventElement.dataset[DATASET_KEYS.EVENT_ID] ?? EMPTY_DATE);
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
      onDrop: (payload, dayElement) => this.#handlers.onEventDrop(payload.eventId, { date: dayElement.dataset[DATASET_KEYS.DATE] ?? EMPTY_DATE })
    });
  }

  #createDayCell(cell: MonthCell, events: CalendarEvent[], holidayNames: string[]): HTMLElement {
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
    for (const event of sortByTime(events)) {
      eventList.append(this.#createEventPill(event));
    }
    dayElement.append(eventList);
    return dayElement;
  }

  #createEventPill(event: CalendarEvent): HTMLButtonElement {
    const pill = decorateEventPill(createElement('button', CSS_CLASSES.EVENT), event);
    const durationSteps = getDurationSteps(event);
    if (durationSteps >= MIN_STRETCHED_DURATION_STEPS) pill.classList.add(EVENT_DURATION_CLASS_PREFIX + durationSteps);
    makeDraggable(pill, () => ({ eventId: event.id, offsetMinutes: NO_TIME_OFFSET }));
    return pill;
  }
}
