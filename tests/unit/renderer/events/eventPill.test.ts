import { describe, expect, it } from 'vitest';
import { decorateEventPill, formatSegmentTime, formatTimeRange } from '@renderer/events/eventPill';
import {
  ALL_DAY_LABEL,
  CSS_CLASSES,
  EVENT_COLOR_CLASS_PREFIX,
  SEGMENT_LABELS,
  TIME_RANGE_SEPARATOR,
  TOOLTIP_SEPARATOR
} from '@renderer/constants';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from '@renderer/events/eventColors';
import { toEventKey } from '@renderer/events/eventKey';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import type { DaySegment } from '@renderer/events/daySegment';
import type { CalendarEvent } from '@shared/calendarEvent';

const START_TIME = '09:00';
const END_TIME = '10:30';
const TITLE = 'Meeting';
const NOTES = 'Raum 4';
const KNOWN_COLOR = EVENT_COLORS[3].id;
const BUTTON_TYPE = 'button';
const END_DATE = '2026-09-18';
const WEEKLY_RECURRENCE = { frequency: 'weekly', interval: 1, until: null } as const;

function createPill(): HTMLButtonElement {
  return document.createElement('button');
}

function createSegment(event: CalendarEvent, isFirst = true, isLast = true): DaySegment {
  return { event, date: event.date, dayOffset: 0, isFirst, isLast };
}

function multiDayEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return createCalendarEvent({ time: START_TIME, endTime: END_TIME, endDate: END_DATE, ...overrides });
}

describe('formatTimeRange', () => {
  it('labels all day events', () => {
    expect(formatTimeRange({ time: START_TIME, endTime: END_TIME, allDay: true })).toBe(ALL_DAY_LABEL);
  });

  it('shows only the start without end time', () => {
    expect(formatTimeRange({ time: START_TIME, endTime: null, allDay: false })).toBe(START_TIME);
  });

  it('joins start and end time', () => {
    expect(formatTimeRange({ time: START_TIME, endTime: END_TIME, allDay: false })).toBe(START_TIME + TIME_RANGE_SEPARATOR + END_TIME);
  });
});

describe('formatSegmentTime', () => {
  it('labels all day events on every segment', () => {
    expect(formatSegmentTime(createSegment(multiDayEvent({ allDay: true }), true, false))).toBe(ALL_DAY_LABEL);
  });

  it('shows the time range of single day events', () => {
    const event = createCalendarEvent({ time: START_TIME, endTime: END_TIME });

    expect(formatSegmentTime(createSegment(event))).toBe(START_TIME + TIME_RANGE_SEPARATOR + END_TIME);
  });

  it('shows the start on the first day of multi day events', () => {
    expect(formatSegmentTime(createSegment(multiDayEvent(), true, false))).toBe(SEGMENT_LABELS.FROM + START_TIME);
  });

  it('shows the end on the last day of multi day events', () => {
    expect(formatSegmentTime(createSegment(multiDayEvent(), false, true))).toBe(SEGMENT_LABELS.UNTIL + END_TIME);
  });

  it('labels the last day without end time as all day', () => {
    expect(formatSegmentTime(createSegment(multiDayEvent({ endTime: null }), false, true))).toBe(ALL_DAY_LABEL);
  });

  it('labels middle days as all day', () => {
    expect(formatSegmentTime(createSegment(multiDayEvent(), false, false))).toBe(ALL_DAY_LABEL);
  });
});

describe('decorateEventPill', () => {
  it('sets type, event key, color class, tooltip with notes and child spans', () => {
    const pill = createPill();
    const event = createCalendarEvent({ time: START_TIME, endTime: END_TIME, title: TITLE, notes: NOTES, color: KNOWN_COLOR });
    const timeLabel = START_TIME + TIME_RANGE_SEPARATOR + END_TIME;

    expect(decorateEventPill(pill, createSegment(event))).toBe(pill);

    const [titleSpan, timeSpan] = Array.from(pill.children);
    const classList = pill.classList;
    expect(pill.type).toBe(BUTTON_TYPE);
    expect(pill.dataset.eventKey).toBe(toEventKey(event));
    expect(pill.title).toBe(timeLabel + ' ' + TITLE + TOOLTIP_SEPARATOR + NOTES);
    expect(classList.contains(EVENT_COLOR_CLASS_PREFIX + KNOWN_COLOR)).toBe(true);
    expect(classList.contains(CSS_CLASSES.EVENT_CONTINUES_BEFORE)).toBe(false);
    expect(classList.contains(CSS_CLASSES.EVENT_CONTINUES_AFTER)).toBe(false);
    expect(classList.contains(CSS_CLASSES.EVENT_RECURRING)).toBe(false);
    expect(titleSpan.className).toBe(CSS_CLASSES.EVENT_TITLE);
    expect(titleSpan.textContent).toBe(TITLE);
    expect(timeSpan.className).toBe(CSS_CLASSES.EVENT_TIME);
    expect(timeSpan.textContent).toBe(timeLabel);
  });

  it('omits notes from the tooltip and falls back to the default color', () => {
    const pill = createPill();
    const event = createCalendarEvent({ time: START_TIME, title: TITLE, notes: '', color: null });

    decorateEventPill(pill, createSegment(event));

    expect(pill.title).toBe(START_TIME + ' ' + TITLE);
    expect(pill.classList.contains(EVENT_COLOR_CLASS_PREFIX + DEFAULT_EVENT_COLOR)).toBe(true);
  });

  it('marks middle segments of recurring multi day events as continuing and recurring', () => {
    const pill = createPill();
    const event = multiDayEvent({ title: TITLE, recurrence: WEEKLY_RECURRENCE });

    decorateEventPill(pill, createSegment(event, false, false));

    const classList = pill.classList;
    expect(pill.title).toBe(ALL_DAY_LABEL + ' ' + TITLE);
    expect(classList.contains(CSS_CLASSES.EVENT_CONTINUES_BEFORE)).toBe(true);
    expect(classList.contains(CSS_CLASSES.EVENT_CONTINUES_AFTER)).toBe(true);
    expect(classList.contains(CSS_CLASSES.EVENT_RECURRING)).toBe(true);
  });
});
