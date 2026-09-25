import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CSS_CLASSES,
  CSS_VARIABLES,
  CURRENT_TIME_TICK_MS,
  HOLIDAY_NAME_SEPARATOR,
  HOURS_PER_DAY,
  INITIAL_SCROLL_HOUR,
  MINUTES_PER_DAY,
  WEEKDAY_LABELS
} from '@renderer/constants';
import { DRAG_EVENTS } from '@renderer/dragDrop/dragTransfer';
import { groupSegmentsByDate } from '@renderer/events/eventGrouping';
import { toEventKey } from '@renderer/events/eventKey';
import { TimeGridView } from '@renderer/views/TimeGridView';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import { createDragEvent, createPayloadTransfer, readTransferPayload } from '@tests/support/dragEvents';
import type { DayColumn } from '@renderer/date/dayColumn';
import type { DayColumnLayout } from '@renderer/date/dayColumnLayout';
import type { HolidayMap } from '@renderer/holidays/holidayDates';
import type { TimeGridHandlers } from '@renderer/views/timeGridHandlers';

const TODAY_ISO = '2026-09-01';
const HOLIDAY_ISO = '2026-09-02';
const YEAR = 2026;
const SEPTEMBER_INDEX = 8;
const TODAY_DAY_NUMBER = 1;
const HOLIDAY_DAY_NUMBER = 2;
const TUESDAY_INDEX = 1;
const WEDNESDAY_INDEX = 2;
const HOLIDAY_NAMES = ['Feiertag A', 'Feiertag B'];
const EMPTY_DATE = '';
const FIRST_LABELED_HOUR = 1;
const FIRST_HOUR_LABEL = '01:00';
const FIRST_BLOCK_VARIABLES = ['540', '120', '0', '2'];
const SECOND_BLOCK_VARIABLES = ['600', '30', '1', '2'];
const NIGHT_LAST_BLOCK_VARIABLES = ['0', '120', '0', '1'];

const NOW_HOUR = 10;
const NOW_MINUTE = 30;
const NOW_MINUTES_OF_DAY = 630;
const NOW_MINUTES_AFTER_TICK = 631;

const COLUMN_TOP = 0;
const PIXELS_PER_MINUTE = 1;
const BLOCK_TOP = 540;
const POINTER_Y = 570;
const DRAG_OFFSET_MINUTES = 30;
const DROP_POINTER_Y = 607;
const DROPPED_START_MINUTES = 570;
const SLOT_POINTER_Y = 607;
const SLOT_TIME = '10:00';
const SCROLL_HEIGHT = 1440;
const NO_DAY_OFFSET = 0;
const SECOND_DAY_OFFSET = 1;
const KEEP_TIME = null;

const FIRST_EVENT = createCalendarEvent({ id: 'first', date: TODAY_ISO, time: '09:00', endTime: '11:00' });
const SECOND_EVENT = createCalendarEvent({ id: 'second', date: TODAY_ISO, time: '10:00', endTime: '10:30' });
const NIGHT_EVENT = createCalendarEvent({ id: 'night', date: TODAY_ISO, endDate: HOLIDAY_ISO, time: '20:00', endTime: '02:00' });
const ALL_DAY_EVENT = createCalendarEvent({ id: 'holiday', date: HOLIDAY_ISO, allDay: true });
const FIRST_KEY = toEventKey(FIRST_EVENT);
const SECOND_KEY = toEventKey(SECOND_EVENT);
const NIGHT_KEY = toEventKey(NIGHT_EVENT);
const ALL_DAY_KEY = toEventKey(ALL_DAY_EVENT);

const TODAY_COLUMN: DayColumn = { iso: TODAY_ISO, dayNumber: TODAY_DAY_NUMBER, weekdayIndex: TUESDAY_INDEX, isToday: true };
const HOLIDAY_COLUMN: DayColumn = { iso: HOLIDAY_ISO, dayNumber: HOLIDAY_DAY_NUMBER, weekdayIndex: WEDNESDAY_INDEX, isToday: false };
const DEFAULT_COLUMNS = [TODAY_COLUMN, HOLIDAY_COLUMN];

const EVENT_SELECTOR = '.' + CSS_CLASSES.EVENT;
const COLUMN_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_COLUMN;
const DAY_HEADER_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_DAY;
const NOW_LINE_SELECTOR = '.' + CSS_CLASSES.NOW_LINE;
const HEADER_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_HEADER;
const ALL_DAY_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_ALL_DAY;
const ALL_DAY_CELL_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_ALL_DAY_CELL;
const CORNER_SELECTOR = '.' + CSS_CLASSES.TIME_GRID_CORNER;

function createLayout(columns: DayColumn[]): DayColumnLayout {
  return { columns, years: [YEAR] };
}

function createHandlers(): TimeGridHandlers {
  return { onEventActivate: vi.fn(), onSlotActivate: vi.fn(), onEventDrop: vi.fn() };
}

function mockRect(element: HTMLElement, top: number, height = MINUTES_PER_DAY * PIXELS_PER_MINUTE): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ top, height } as DOMRect);
}

function dispatchMouse(target: Element, type: string, clientY = COLUMN_TOP): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientY }));
}

function dropOn(zone: HTMLElement, eventKey: string, dayOffset: number, offsetMinutes: number | null): void {
  const payload = { eventKey, dayOffset, offsetMinutes };
  zone.dispatchEvent(createDragEvent(DRAG_EVENTS.DROP, { dataTransfer: createPayloadTransfer(payload), clientY: DROP_POINTER_Y }));
}

function startDragOf(element: HTMLElement): DataTransfer {
  const dataTransfer = new DataTransfer();
  element.dispatchEvent(createDragEvent(DRAG_EVENTS.START, { dataTransfer, clientY: POINTER_Y }));
  return dataTransfer;
}

function readBlockVariables(block: HTMLElement): string[] {
  return [CSS_VARIABLES.BLOCK_START, CSS_VARIABLES.BLOCK_MINUTES, CSS_VARIABLES.BLOCK_COLUMN, CSS_VARIABLES.BLOCK_COLUMNS].map(
    (variable) => block.style.getPropertyValue(variable)
  );
}

describe('TimeGridView', () => {
  let handlers: TimeGridHandlers;
  let view: TimeGridView;
  let animationFrame: ReturnType<typeof vi.fn<(callback: FrameRequestCallback) => number>>;
  const segmentsByDate = groupSegmentsByDate([SECOND_EVENT, FIRST_EVENT, NIGHT_EVENT, ALL_DAY_EVENT]);
  const holidaysByDate: HolidayMap = new Map([[HOLIDAY_ISO, HOLIDAY_NAMES]]);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(YEAR, SEPTEMBER_INDEX, TODAY_DAY_NUMBER, NOW_HOUR, NOW_MINUTE));
    animationFrame = vi.fn<(callback: FrameRequestCallback) => number>();
    vi.stubGlobal('requestAnimationFrame', animationFrame);
    handlers = createHandlers();
    view = new TimeGridView(handlers);
    document.body.replaceChildren(view.element);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderDefault(): void {
    view.render(createLayout(DEFAULT_COLUMNS), segmentsByDate, holidaysByDate);
  }

  function queryAll(selector: string): HTMLElement[] {
    return [...view.element.querySelectorAll<HTMLElement>(selector)];
  }

  function requireBlock(eventKey: string, container: ParentNode = view.element): HTMLButtonElement {
    const block = container.querySelector<HTMLButtonElement>(`${EVENT_SELECTOR}[data-event-key="${eventKey}"]`);
    if (!block) throw new Error(eventKey);
    return block;
  }

  function requireNowLine(): HTMLElement {
    const nowLine = view.element.querySelector<HTMLElement>(NOW_LINE_SELECTOR);
    if (!nowLine) throw new Error(NOW_LINE_SELECTOR);
    return nowLine;
  }

  it('renders hour labels for every hour except midnight', () => {
    const labels = queryAll('.' + CSS_CLASSES.TIME_GRID_HOUR);
    expect(labels).toHaveLength(HOURS_PER_DAY - FIRST_LABELED_HOUR);
    expect(labels.map((label) => label.style.getPropertyValue(CSS_VARIABLES.HOUR))).toEqual(
      Array.from({ length: HOURS_PER_DAY - FIRST_LABELED_HOUR }, (_, index) => String(index + FIRST_LABELED_HOUR))
    );
    expect(labels[0].textContent).toBe(FIRST_HOUR_LABEL);
  });

  it('sets the day count and renders a corner plus one header per column', () => {
    renderDefault();
    expect(view.element.style.getPropertyValue(CSS_VARIABLES.DAY_COUNT)).toBe(String(DEFAULT_COLUMNS.length));
    expect(queryAll(HEADER_SELECTOR + ' ' + CORNER_SELECTOR)).toHaveLength(1);
    const [todayHeader, holidayHeader] = queryAll(DAY_HEADER_SELECTOR);
    expect(todayHeader.querySelector('.' + CSS_CLASSES.TIME_GRID_DAY_NAME)?.textContent).toBe(WEEKDAY_LABELS[TUESDAY_INDEX]);
    expect(todayHeader.querySelector('.' + CSS_CLASSES.TIME_GRID_DAY_NUMBER)?.textContent).toBe(String(TODAY_DAY_NUMBER));
    expect(holidayHeader.querySelector('.' + CSS_CLASSES.TIME_GRID_DAY_NAME)?.textContent).toBe(WEEKDAY_LABELS[WEDNESDAY_INDEX]);
  });

  it('marks today and holiday headers and shows the holiday names', () => {
    renderDefault();
    const [todayHeader, holidayHeader] = queryAll(DAY_HEADER_SELECTOR);
    const holidayLabel = HOLIDAY_NAMES.join(HOLIDAY_NAME_SEPARATOR);
    const nameElement = holidayHeader.querySelector<HTMLElement>('.' + CSS_CLASSES.TIME_GRID_HOLIDAY_NAME);

    expect(todayHeader.classList.contains(CSS_CLASSES.TIME_GRID_DAY_TODAY)).toBe(true);
    expect(todayHeader.classList.contains(CSS_CLASSES.TIME_GRID_DAY_HOLIDAY)).toBe(false);
    expect(todayHeader.querySelector('.' + CSS_CLASSES.TIME_GRID_HOLIDAY_NAME)).toBeNull();
    expect(holidayHeader.classList.contains(CSS_CLASSES.TIME_GRID_DAY_TODAY)).toBe(false);
    expect(holidayHeader.classList.contains(CSS_CLASSES.TIME_GRID_DAY_HOLIDAY)).toBe(true);
    expect(nameElement?.textContent).toBe(holidayLabel);
    expect(nameElement?.title).toBe(holidayLabel);
  });

  it('renders an all day row with a corner plus one dated cell per column', () => {
    renderDefault();
    const cells = queryAll(ALL_DAY_CELL_SELECTOR);
    const [todayCell, holidayCell] = cells;
    expect(queryAll(ALL_DAY_SELECTOR + ' ' + CORNER_SELECTOR)).toHaveLength(1);
    expect(cells.map((cell) => cell.dataset.date)).toEqual([TODAY_ISO, HOLIDAY_ISO]);
    expect(todayCell.classList.contains(CSS_CLASSES.TIME_GRID_ALL_DAY_CELL_TODAY)).toBe(true);
    expect(holidayCell.classList.contains(CSS_CLASSES.TIME_GRID_ALL_DAY_CELL_TODAY)).toBe(false);
  });

  it('renders all day events only in the all day row', () => {
    renderDefault();
    const pill = requireBlock(ALL_DAY_KEY, queryAll(ALL_DAY_CELL_SELECTOR)[1]);
    expect(pill.classList.contains(CSS_CLASSES.EVENT_BLOCK)).toBe(false);
    expect(queryAll(`${COLUMN_SELECTOR} [data-event-key="${ALL_DAY_KEY}"]`)).toHaveLength(0);
    expect(queryAll(`${ALL_DAY_CELL_SELECTOR} [data-event-key="${FIRST_KEY}"]`)).toHaveLength(0);
  });

  it('marks today and holiday columns', () => {
    renderDefault();
    const [todayColumn, holidayColumn] = queryAll(COLUMN_SELECTOR);
    expect(todayColumn.dataset.date).toBe(TODAY_ISO);
    expect(todayColumn.classList.contains(CSS_CLASSES.TIME_GRID_COLUMN_TODAY)).toBe(true);
    expect(todayColumn.classList.contains(CSS_CLASSES.TIME_GRID_COLUMN_HOLIDAY)).toBe(false);
    expect(holidayColumn.classList.contains(CSS_CLASSES.TIME_GRID_COLUMN_TODAY)).toBe(false);
    expect(holidayColumn.classList.contains(CSS_CLASSES.TIME_GRID_COLUMN_HOLIDAY)).toBe(true);
  });

  it('positions event blocks with the variables of the day layout', () => {
    renderDefault();
    const firstBlock = requireBlock(FIRST_KEY);
    expect(firstBlock.classList.contains(CSS_CLASSES.EVENT_BLOCK)).toBe(true);
    expect(readBlockVariables(firstBlock)).toEqual(FIRST_BLOCK_VARIABLES);
    expect(readBlockVariables(requireBlock(SECOND_KEY))).toEqual(SECOND_BLOCK_VARIABLES);
  });

  it('renders a block for every day covered by a timed multi day event', () => {
    renderDefault();
    const [todayColumn, holidayColumn] = queryAll(COLUMN_SELECTOR);
    expect(requireBlock(NIGHT_KEY, todayColumn).classList.contains(CSS_CLASSES.EVENT_CONTINUES_AFTER)).toBe(true);
    expect(readBlockVariables(requireBlock(NIGHT_KEY, holidayColumn))).toEqual(NIGHT_LAST_BLOCK_VARIABLES);
  });

  it('shows the now line only in the today column at the current time', () => {
    renderDefault();
    const [todayColumn, holidayColumn] = queryAll(COLUMN_SELECTOR);
    expect(todayColumn.querySelector(NOW_LINE_SELECTOR)).not.toBeNull();
    expect(holidayColumn.querySelector(NOW_LINE_SELECTOR)).toBeNull();
    expect(requireNowLine().style.getPropertyValue(CSS_VARIABLES.BLOCK_START)).toBe(String(NOW_MINUTES_OF_DAY));
  });

  it('moves the now line on every tick once started', () => {
    view.start();
    renderDefault();
    vi.advanceTimersByTime(CURRENT_TIME_TICK_MS);
    expect(requireNowLine().style.getPropertyValue(CSS_VARIABLES.BLOCK_START)).toBe(String(NOW_MINUTES_AFTER_TICK));
  });

  it('renders no now line without a today column and ticks safely', () => {
    view.start();
    view.render(createLayout([HOLIDAY_COLUMN]), segmentsByDate, holidaysByDate);
    vi.advanceTimersByTime(CURRENT_TIME_TICK_MS);
    expect(view.element.querySelector(NOW_LINE_SELECTOR)).toBeNull();
  });

  it('scrolls to the working hours only after the first render', () => {
    renderDefault();
    const columnsElement = view.element.querySelector('.' + CSS_CLASSES.TIME_GRID_COLUMNS) as HTMLElement;
    const bodyElement = view.element.querySelector('.' + CSS_CLASSES.TIME_GRID_BODY) as HTMLElement;
    Object.defineProperty(columnsElement, 'scrollHeight', { value: SCROLL_HEIGHT });
    const [scrollCallback] = animationFrame.mock.calls[0];
    scrollCallback(COLUMN_TOP);
    renderDefault();

    expect(animationFrame).toHaveBeenCalledTimes(1);
    expect(bodyElement.scrollTop).toBe((SCROLL_HEIGHT / HOURS_PER_DAY) * INITIAL_SCROLL_HOUR);
  });

  it('activates an event when its block is clicked', () => {
    renderDefault();
    dispatchMouse(requireBlock(FIRST_KEY).firstElementChild as Element, 'click');
    expect(handlers.onEventActivate).toHaveBeenCalledWith(FIRST_KEY);
  });

  it('activates an all day event when its pill is clicked', () => {
    renderDefault();
    dispatchMouse(requireBlock(ALL_DAY_KEY), 'click');
    expect(handlers.onEventActivate).toHaveBeenCalledWith(ALL_DAY_KEY);
  });

  it('activates with an empty key when the block lost its event key', () => {
    renderDefault();
    const block = requireBlock(FIRST_KEY);
    delete block.dataset.eventKey;
    dispatchMouse(block, 'click');
    expect(handlers.onEventActivate).toHaveBeenCalledWith(EMPTY_DATE);
  });

  it('ignores clicks outside of event blocks', () => {
    renderDefault();
    dispatchMouse(queryAll(COLUMN_SELECTOR)[1], 'click');
    expect(handlers.onEventActivate).not.toHaveBeenCalled();
  });

  it('activates a snapped slot on double click in a column', () => {
    renderDefault();
    const holidayColumn = queryAll(COLUMN_SELECTOR)[1];
    mockRect(holidayColumn, COLUMN_TOP);
    dispatchMouse(holidayColumn, 'dblclick', SLOT_POINTER_Y);
    expect(handlers.onSlotActivate).toHaveBeenCalledWith(HOLIDAY_ISO, SLOT_TIME);
  });

  it('activates a slot with an empty date when the column lost its date', () => {
    renderDefault();
    const holidayColumn = queryAll(COLUMN_SELECTOR)[1];
    mockRect(holidayColumn, COLUMN_TOP);
    delete holidayColumn.dataset.date;
    dispatchMouse(holidayColumn, 'dblclick', SLOT_POINTER_Y);
    expect(handlers.onSlotActivate).toHaveBeenCalledWith(EMPTY_DATE, SLOT_TIME);
  });

  it('does not activate a slot when double clicking an event block', () => {
    renderDefault();
    dispatchMouse(requireBlock(FIRST_KEY), 'dblclick');
    expect(handlers.onSlotActivate).not.toHaveBeenCalled();
  });

  it('does not activate a slot when double clicking outside of columns', () => {
    renderDefault();
    dispatchMouse(view.element.querySelector('.' + CSS_CLASSES.TIME_GRID_COLUMNS) as Element, 'dblclick');
    expect(handlers.onSlotActivate).not.toHaveBeenCalled();
  });

  it('moves a dropped event to the snapped start minus the grab offset', () => {
    renderDefault();
    const holidayColumn = queryAll(COLUMN_SELECTOR)[1];
    mockRect(holidayColumn, COLUMN_TOP);
    dropOn(holidayColumn, FIRST_KEY, NO_DAY_OFFSET, DRAG_OFFSET_MINUTES);
    expect(handlers.onEventDrop).toHaveBeenCalledWith(FIRST_KEY, { date: HOLIDAY_ISO, startMinutes: DROPPED_START_MINUTES });
  });

  it('moves a dropped later segment by its day offset while keeping the time', () => {
    renderDefault();
    dropOn(queryAll(COLUMN_SELECTOR)[1], NIGHT_KEY, SECOND_DAY_OFFSET, KEEP_TIME);
    expect(handlers.onEventDrop).toHaveBeenCalledWith(NIGHT_KEY, { date: TODAY_ISO });
  });

  it('moves a dropped event to an empty date when the column lost its date', () => {
    renderDefault();
    const holidayColumn = queryAll(COLUMN_SELECTOR)[1];
    mockRect(holidayColumn, COLUMN_TOP);
    delete holidayColumn.dataset.date;
    dropOn(holidayColumn, FIRST_KEY, NO_DAY_OFFSET, DRAG_OFFSET_MINUTES);
    expect(handlers.onEventDrop).toHaveBeenCalledWith(FIRST_KEY, { date: EMPTY_DATE, startMinutes: DROPPED_START_MINUTES });
  });

  it('moves an event dropped on the all day row to that date only', () => {
    renderDefault();
    dropOn(queryAll(ALL_DAY_CELL_SELECTOR)[0], ALL_DAY_KEY, NO_DAY_OFFSET, KEEP_TIME);
    expect(handlers.onEventDrop).toHaveBeenCalledWith(ALL_DAY_KEY, { date: TODAY_ISO });
  });

  it('moves an event dropped on the all day row to an empty date when the cell lost its date', () => {
    renderDefault();
    const [todayCell] = queryAll(ALL_DAY_CELL_SELECTOR);
    delete todayCell.dataset.date;
    dropOn(todayCell, ALL_DAY_KEY, NO_DAY_OFFSET, KEEP_TIME);
    expect(handlers.onEventDrop).toHaveBeenCalledWith(ALL_DAY_KEY, { date: EMPTY_DATE });
  });

  it('starts dragging a block with the offset between pointer and block top', () => {
    renderDefault();
    const block = requireBlock(FIRST_KEY);
    mockRect(queryAll(COLUMN_SELECTOR)[0], COLUMN_TOP);
    mockRect(block, BLOCK_TOP);
    const dataTransfer = startDragOf(block);
    expect(readTransferPayload(dataTransfer)).toEqual({ eventKey: FIRST_KEY, dayOffset: NO_DAY_OFFSET, offsetMinutes: DRAG_OFFSET_MINUTES });
  });

  it('starts dragging a later segment block with its day offset and without a time offset', () => {
    renderDefault();
    const dataTransfer = startDragOf(requireBlock(NIGHT_KEY, queryAll(COLUMN_SELECTOR)[1]));
    expect(readTransferPayload(dataTransfer)).toEqual({ eventKey: NIGHT_KEY, dayOffset: SECOND_DAY_OFFSET, offsetMinutes: KEEP_TIME });
  });

  it('starts dragging an all day pill without a time offset', () => {
    renderDefault();
    const pill = requireBlock(ALL_DAY_KEY);
    const dataTransfer = startDragOf(pill);
    expect(pill.draggable).toBe(true);
    expect(readTransferPayload(dataTransfer)).toEqual({ eventKey: ALL_DAY_KEY, dayOffset: NO_DAY_OFFSET, offsetMinutes: KEEP_TIME });
  });
});
