import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { REMINDER_CHECK_INTERVAL_MS } from '@main/constants';
import { toEventDate } from '@main/reminders/reminderRules';
import { ReminderScheduler } from '@main/reminders/ReminderScheduler';
import type { ReminderNotifier } from '@main/reminders/reminderNotifier';
import type { CalendarEvent } from '@shared/calendarEvent';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';

const NOW = new Date(2026, 8, 16, 9, 0, 0, 0);
const EVENT_DATE = '2026-09-16';
const PREVIOUS_DATE = '2026-09-15';
const REMINDER_MINUTES = 10;
const DUE_EVENT = createCalendarEvent({ id: 'due', date: EVENT_DATE, time: '09:05', reminderMinutes: REMINDER_MINUTES });
const LATER_EVENT = createCalendarEvent({ id: 'later', date: EVENT_DATE, time: '18:00', reminderMinutes: REMINDER_MINUTES });
const MISSED_OCCURRENCE = { ...DUE_EVENT, date: PREVIOUS_DATE };
const SINGLE_TIMER = 1;
const NO_TIMERS = 0;

let getPendingReminders: Mock<(referenceDate: string) => CalendarEvent[]>;
let markNotified: Mock<(id: string, occurrenceDate: string) => void>;
let notify: Mock<ReminderNotifier>;
let scheduler: ReminderScheduler;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  getPendingReminders = vi.fn(() => [DUE_EVENT, LATER_EVENT]);
  markNotified = vi.fn();
  notify = vi.fn();
  scheduler = new ReminderScheduler({ getPendingReminders, markNotified }, notify);
});

afterEach(() => {
  scheduler.stop();
  vi.useRealTimers();
});

describe('ReminderScheduler', () => {
  it('asks the store for pending reminders up to today', () => {
    scheduler.check();

    expect(getPendingReminders).toHaveBeenCalledWith(EVENT_DATE);
  });

  it('notifies and marks only due events on check', () => {
    scheduler.check();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(DUE_EVENT, toEventDate(DUE_EVENT));
    expect(markNotified).toHaveBeenCalledTimes(1);
    expect(markNotified).toHaveBeenCalledWith(DUE_EVENT.id, DUE_EVENT.date);
  });

  it('notifies only the latest due occurrence of a series', () => {
    getPendingReminders.mockReturnValue([MISSED_OCCURRENCE, DUE_EVENT]);

    scheduler.check();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(DUE_EVENT, toEventDate(DUE_EVENT));
    expect(markNotified).toHaveBeenCalledWith(DUE_EVENT.id, DUE_EVENT.date);
  });

  it('checks immediately on start and again after each interval', () => {
    scheduler.start();
    expect(getPendingReminders).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(REMINDER_CHECK_INTERVAL_MS);
    expect(getPendingReminders).toHaveBeenCalledTimes(2);
  });

  it('does not start a second timer when started twice', () => {
    scheduler.start();
    scheduler.start();
    expect(vi.getTimerCount()).toBe(SINGLE_TIMER);
    expect(getPendingReminders).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(REMINDER_CHECK_INTERVAL_MS);
    expect(getPendingReminders).toHaveBeenCalledTimes(2);
  });

  it('stops checking after stop and tolerates repeated stops', () => {
    scheduler.start();
    scheduler.stop();
    scheduler.stop();

    vi.advanceTimersByTime(REMINDER_CHECK_INTERVAL_MS);
    expect(vi.getTimerCount()).toBe(NO_TIMERS);
    expect(getPendingReminders).toHaveBeenCalledTimes(1);
  });

  it('can be restarted after being stopped', () => {
    scheduler.start();
    scheduler.stop();
    scheduler.start();

    expect(vi.getTimerCount()).toBe(SINGLE_TIMER);
    expect(getPendingReminders).toHaveBeenCalledTimes(2);
  });
});
