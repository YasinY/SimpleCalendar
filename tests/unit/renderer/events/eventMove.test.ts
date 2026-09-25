import { describe, expect, it } from 'vitest';
import { moveEventTo } from '@renderer/events/eventMove';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';

const SOURCE_DATE = '2026-09-16';
const TARGET_DATE = '2026-09-18';
const SOURCE_END_DATE = '2026-09-17';
const TARGET_END_DATE = '2026-09-19';
const TEN_AM_MINUTES = 600;
const TEN_AM = '10:00';
const ELEVEN_THIRTY = '11:30';
const LATE_EVENING_MINUTES = 1430;
const TEN_PM_THIRTY = '22:30';
const MIDNIGHT = '24:00';
const LATE_EVENING = '23:50';
const START_TIME = '09:00';
const END_TIME = '10:30';

describe('moveEventTo', () => {
  it('only changes the date when no start minutes are given', () => {
    const event = createCalendarEvent({ date: SOURCE_DATE, endTime: END_TIME });

    expect(moveEventTo(event, { date: TARGET_DATE })).toEqual({ ...event, occurrenceDate: SOURCE_DATE, date: TARGET_DATE });
  });

  it('only changes the date for all day events', () => {
    const event = createCalendarEvent({ date: SOURCE_DATE, allDay: true });

    expect(moveEventTo(event, { date: TARGET_DATE, startMinutes: TEN_AM_MINUTES })).toEqual({
      ...event,
      occurrenceDate: SOURCE_DATE,
      date: TARGET_DATE
    });
  });

  it('shifts the end date of multi day events by the same number of days', () => {
    const event = createCalendarEvent({ date: SOURCE_DATE, endDate: SOURCE_END_DATE });

    expect(moveEventTo(event, { date: TARGET_DATE })).toEqual({
      ...event,
      occurrenceDate: SOURCE_DATE,
      date: TARGET_DATE,
      endDate: TARGET_END_DATE
    });
  });

  it('only changes the start time of multi day events without clamping', () => {
    const event = createCalendarEvent({ date: SOURCE_DATE, endDate: SOURCE_END_DATE, time: START_TIME, endTime: END_TIME });

    const moved = moveEventTo(event, { date: TARGET_DATE, startMinutes: LATE_EVENING_MINUTES });

    expect(moved).toEqual({
      ...event,
      occurrenceDate: SOURCE_DATE,
      date: TARGET_DATE,
      endDate: TARGET_END_DATE,
      time: LATE_EVENING
    });
  });

  it('shifts start and end time while keeping the duration', () => {
    const event = createCalendarEvent({ date: SOURCE_DATE, time: START_TIME, endTime: END_TIME });

    const moved = moveEventTo(event, { date: TARGET_DATE, startMinutes: TEN_AM_MINUTES });

    expect(moved).toEqual({ ...event, occurrenceDate: SOURCE_DATE, date: TARGET_DATE, time: TEN_AM, endTime: ELEVEN_THIRTY });
  });

  it('keeps a missing end time empty', () => {
    const event = createCalendarEvent({ date: SOURCE_DATE, time: START_TIME, endTime: null });

    const moved = moveEventTo(event, { date: TARGET_DATE, startMinutes: TEN_AM_MINUTES });

    expect(moved).toEqual({ ...event, occurrenceDate: SOURCE_DATE, date: TARGET_DATE, time: TEN_AM, endTime: null });
  });

  it('clamps the start so the event ends by the end of the day', () => {
    const event = createCalendarEvent({ date: SOURCE_DATE, time: START_TIME, endTime: END_TIME });

    const moved = moveEventTo(event, { date: TARGET_DATE, startMinutes: LATE_EVENING_MINUTES });

    expect(moved).toEqual({ ...event, occurrenceDate: SOURCE_DATE, date: TARGET_DATE, time: TEN_PM_THIRTY, endTime: MIDNIGHT });
  });

  it('does not clamp late starts of events without duration', () => {
    const event = createCalendarEvent({ time: START_TIME, endTime: null });

    const moved = moveEventTo(event, { date: TARGET_DATE, startMinutes: LATE_EVENING_MINUTES });

    expect(moved.time).toBe(LATE_EVENING);
  });
});
