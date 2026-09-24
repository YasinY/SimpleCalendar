import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CSS_CLASSES,
  EVENT_DURATION_CLASS_PREFIX,
  GRID_WEEK_CLASS_PREFIX,
  HOLIDAY_NAME_SEPARATOR,
  MIN_STRETCHED_DURATION_STEPS,
  WEEKDAY_LABELS
} from '../../../../src/renderer/constants';
import { DRAG_EVENTS } from '../../../../src/renderer/dragDrop/dragTransfer';
import { MonthView } from '../../../../src/renderer/views/MonthView';
import { createCalendarEvent } from '../../../support/calendarEventFactory';
import { createDragEvent, createPayloadTransfer, readTransferPayload } from '../../../support/dragEvents';
import type { MonthCell } from '../../../../src/renderer/date/monthCell';
import type { MonthGrid } from '../../../../src/renderer/date/monthGrid';
import type { HolidayMap } from '../../../../src/renderer/holidays/holidayDates';
import type { EventsByDate } from '../../../../src/renderer/views/eventsByDate';
import type { MonthViewHandlers } from '../../../../src/renderer/views/monthViewHandlers';

const OUTSIDE_ISO = '2026-08-31';
const TODAY_ISO = '2026-09-01';
const HOLIDAY_ISO = '2026-09-02';
const OUTSIDE_DAY_NUMBER = 31;
const TODAY_DAY_NUMBER = 1;
const HOLIDAY_DAY_NUMBER = 2;
const WEEK_COUNT = 5;
const OTHER_WEEK_COUNT = 6;
const YEAR = 2026;
const HOLIDAY_NAMES = ['Feiertag A', 'Feiertag B'];
const EMPTY_DATE = '';
const NO_OFFSET = 0;

const LATE_EVENT = createCalendarEvent({ id: 'late', time: '15:00', endTime: '15:30' });
const EARLY_EVENT = createCalendarEvent({ id: 'early', time: '08:00', endTime: '11:00' });
const EARLY_EVENT_STEPS = 3;

const DAY_SELECTOR = '.' + CSS_CLASSES.DAY;
const EVENT_SELECTOR = '.' + CSS_CLASSES.EVENT;

const CELLS: MonthCell[] = [
  { iso: OUTSIDE_ISO, dayNumber: OUTSIDE_DAY_NUMBER, isCurrentMonth: false, isToday: false },
  { iso: TODAY_ISO, dayNumber: TODAY_DAY_NUMBER, isCurrentMonth: true, isToday: true },
  { iso: HOLIDAY_ISO, dayNumber: HOLIDAY_DAY_NUMBER, isCurrentMonth: true, isToday: false }
];

function createGrid(weekCount: number): MonthGrid {
  return { cells: CELLS, weekCount, years: [YEAR] };
}

function createHandlers(): MonthViewHandlers {
  return { onDayActivate: vi.fn(), onEventActivate: vi.fn(), onEventDrop: vi.fn() };
}

function dispatchMouse(target: Element, type: string): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true }));
}

describe('MonthView', () => {
  let handlers: MonthViewHandlers;
  let view: MonthView;
  let dayElements: HTMLElement[];

  beforeEach(() => {
    handlers = createHandlers();
    view = new MonthView(handlers);
    document.body.replaceChildren(view.element);
    const eventsByDate: EventsByDate = new Map([[TODAY_ISO, [LATE_EVENT, EARLY_EVENT]]]);
    const holidaysByDate: HolidayMap = new Map([[HOLIDAY_ISO, HOLIDAY_NAMES]]);
    view.render(createGrid(WEEK_COUNT), eventsByDate, holidaysByDate);
    dayElements = [...view.element.querySelectorAll<HTMLElement>(DAY_SELECTOR)];
  });

  function requirePill(eventId: string): HTMLButtonElement {
    const pill = view.element.querySelector<HTMLButtonElement>(`${EVENT_SELECTOR}[data-event-id="${eventId}"]`);
    if (!pill) throw new Error(eventId);
    return pill;
  }

  it('renders the weekday labels', () => {
    const labels = [...view.element.querySelectorAll('.' + CSS_CLASSES.WEEKDAY)].map((label) => label.textContent);
    expect(labels).toEqual(WEEKDAY_LABELS);
  });

  it('renders one day cell per grid cell with its date and number', () => {
    expect(dayElements.map((day) => day.dataset.date)).toEqual(CELLS.map((cell) => cell.iso));
    const numbers = dayElements.map((day) => day.querySelector('.' + CSS_CLASSES.DAY_NUMBER)?.textContent);
    expect(numbers).toEqual(CELLS.map((cell) => String(cell.dayNumber)));
  });

  it('marks days outside the month and today', () => {
    const [outsideDay, todayDay, holidayDay] = dayElements;
    expect(outsideDay.classList.contains(CSS_CLASSES.DAY_OUTSIDE)).toBe(true);
    expect(todayDay.classList.contains(CSS_CLASSES.DAY_OUTSIDE)).toBe(false);
    expect(todayDay.classList.contains(CSS_CLASSES.DAY_TODAY)).toBe(true);
    expect(holidayDay.classList.contains(CSS_CLASSES.DAY_TODAY)).toBe(false);
  });

  it('marks holidays with a class and a titled name', () => {
    const [outsideDay, , holidayDay] = dayElements;
    const holidayLabel = HOLIDAY_NAMES.join(HOLIDAY_NAME_SEPARATOR);
    const nameElement = holidayDay.querySelector<HTMLElement>('.' + CSS_CLASSES.DAY_HOLIDAY_NAME);
    expect(holidayDay.classList.contains(CSS_CLASSES.DAY_HOLIDAY)).toBe(true);
    expect(nameElement?.textContent).toBe(holidayLabel);
    expect(nameElement?.title).toBe(holidayLabel);
    expect(outsideDay.classList.contains(CSS_CLASSES.DAY_HOLIDAY)).toBe(false);
    expect(outsideDay.querySelector('.' + CSS_CLASSES.DAY_HOLIDAY_NAME)).toBeNull();
  });

  it('renders events sorted by time', () => {
    const pills = [...dayElements[1].querySelectorAll<HTMLElement>(EVENT_SELECTOR)];
    expect(pills.map((pill) => pill.dataset.eventId)).toEqual([EARLY_EVENT.id, LATE_EVENT.id]);
  });

  it('adds the duration class only from the minimum stretched duration on', () => {
    const hasDurationClass = (pill: HTMLElement) => [...pill.classList].some((name) => name.startsWith(EVENT_DURATION_CLASS_PREFIX));
    expect(EARLY_EVENT_STEPS).toBeGreaterThanOrEqual(MIN_STRETCHED_DURATION_STEPS);
    expect(requirePill(EARLY_EVENT.id).classList.contains(EVENT_DURATION_CLASS_PREFIX + EARLY_EVENT_STEPS)).toBe(true);
    expect(hasDurationClass(requirePill(LATE_EVENT.id))).toBe(false);
  });

  it('replaces the previous week count class on re-render', () => {
    const grid = view.element.querySelector('.' + CSS_CLASSES.GRID) as HTMLElement;
    expect(grid.classList.contains(GRID_WEEK_CLASS_PREFIX + WEEK_COUNT)).toBe(true);
    view.render(createGrid(OTHER_WEEK_COUNT), new Map(), new Map());
    expect(grid.classList.contains(GRID_WEEK_CLASS_PREFIX + WEEK_COUNT)).toBe(false);
    expect(grid.classList.contains(GRID_WEEK_CLASS_PREFIX + OTHER_WEEK_COUNT)).toBe(true);
    expect(grid.classList.contains(CSS_CLASSES.GRID)).toBe(true);
  });

  it('activates an event when its pill is clicked', () => {
    dispatchMouse(requirePill(EARLY_EVENT.id).firstElementChild as Element, 'click');
    expect(handlers.onEventActivate).toHaveBeenCalledWith(EARLY_EVENT.id);
  });

  it('activates with an empty id when the pill lost its event id', () => {
    const pill = requirePill(EARLY_EVENT.id);
    delete pill.dataset.eventId;
    dispatchMouse(pill, 'click');
    expect(handlers.onEventActivate).toHaveBeenCalledWith(EMPTY_DATE);
  });

  it('ignores clicks outside of event pills', () => {
    dispatchMouse(dayElements[0], 'click');
    expect(handlers.onEventActivate).not.toHaveBeenCalled();
  });

  it('activates a day on double click', () => {
    dispatchMouse(dayElements[2].firstElementChild as Element, 'dblclick');
    expect(handlers.onDayActivate).toHaveBeenCalledWith(HOLIDAY_ISO);
  });

  it('activates with an empty date when the day lost its date', () => {
    const day = dayElements[2];
    delete day.dataset.date;
    dispatchMouse(day, 'dblclick');
    expect(handlers.onDayActivate).toHaveBeenCalledWith(EMPTY_DATE);
  });

  it('does not activate a day when double clicking an event pill', () => {
    dispatchMouse(requirePill(EARLY_EVENT.id), 'dblclick');
    expect(handlers.onDayActivate).not.toHaveBeenCalled();
  });

  it('does not activate a day when double clicking outside of days', () => {
    dispatchMouse(view.element.querySelector('.' + CSS_CLASSES.GRID) as Element, 'dblclick');
    expect(handlers.onDayActivate).not.toHaveBeenCalled();
  });

  it('moves a dropped event to the target day', () => {
    const payload = { eventId: LATE_EVENT.id, offsetMinutes: NO_OFFSET };
    dayElements[2].dispatchEvent(createDragEvent(DRAG_EVENTS.DROP, { dataTransfer: createPayloadTransfer(payload) }));
    expect(handlers.onEventDrop).toHaveBeenCalledWith(LATE_EVENT.id, { date: HOLIDAY_ISO });
  });

  it('moves a dropped event to an empty date when the day lost its date', () => {
    const day = dayElements[2];
    const payload = { eventId: LATE_EVENT.id, offsetMinutes: NO_OFFSET };
    delete day.dataset.date;
    day.dispatchEvent(createDragEvent(DRAG_EVENTS.DROP, { dataTransfer: createPayloadTransfer(payload) }));
    expect(handlers.onEventDrop).toHaveBeenCalledWith(LATE_EVENT.id, { date: EMPTY_DATE });
  });

  it('starts dragging a pill without a time offset', () => {
    const pill = requirePill(EARLY_EVENT.id);
    const dataTransfer = new DataTransfer();
    pill.dispatchEvent(createDragEvent(DRAG_EVENTS.START, { dataTransfer }));
    expect(pill.draggable).toBe(true);
    expect(readTransferPayload(dataTransfer)).toEqual({ eventId: EARLY_EVENT.id, offsetMinutes: NO_OFFSET });
  });
});
