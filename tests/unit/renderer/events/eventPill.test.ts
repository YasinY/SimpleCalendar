import { describe, expect, it } from 'vitest';
import { decorateEventPill, formatTimeRange } from '../../../../src/renderer/events/eventPill';
import {
  ALL_DAY_LABEL,
  CSS_CLASSES,
  EVENT_COLOR_CLASS_PREFIX,
  TIME_RANGE_SEPARATOR,
  TOOLTIP_SEPARATOR
} from '../../../../src/renderer/constants';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from '../../../../src/renderer/events/eventColors';
import { createCalendarEvent } from '../../../support/calendarEventFactory';

const START_TIME = '09:00';
const END_TIME = '10:30';
const TITLE = 'Meeting';
const NOTES = 'Raum 4';
const KNOWN_COLOR = EVENT_COLORS[3].id;
const BUTTON_TYPE = 'button';

function createPill(): HTMLButtonElement {
  return document.createElement('button');
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

describe('decorateEventPill', () => {
  it('sets type, event id, color class, tooltip with notes and child spans', () => {
    const pill = createPill();
    const event = createCalendarEvent({ time: START_TIME, endTime: END_TIME, title: TITLE, notes: NOTES, color: KNOWN_COLOR });
    const timeLabel = START_TIME + TIME_RANGE_SEPARATOR + END_TIME;

    expect(decorateEventPill(pill, event)).toBe(pill);

    const [titleSpan, timeSpan] = Array.from(pill.children);
    expect(pill.type).toBe(BUTTON_TYPE);
    expect(pill.dataset.eventId).toBe(event.id);
    expect(pill.title).toBe(timeLabel + ' ' + TITLE + TOOLTIP_SEPARATOR + NOTES);
    expect(pill.classList.contains(EVENT_COLOR_CLASS_PREFIX + KNOWN_COLOR)).toBe(true);
    expect(titleSpan.className).toBe(CSS_CLASSES.EVENT_TITLE);
    expect(titleSpan.textContent).toBe(TITLE);
    expect(timeSpan.className).toBe(CSS_CLASSES.EVENT_TIME);
    expect(timeSpan.textContent).toBe(timeLabel);
  });

  it('omits notes from the tooltip and falls back to the default color', () => {
    const pill = createPill();
    const event = createCalendarEvent({ time: START_TIME, title: TITLE, notes: '', color: null });

    decorateEventPill(pill, event);

    expect(pill.title).toBe(START_TIME + ' ' + TITLE);
    expect(pill.classList.contains(EVENT_COLOR_CLASS_PREFIX + DEFAULT_EVENT_COLOR)).toBe(true);
  });
});
