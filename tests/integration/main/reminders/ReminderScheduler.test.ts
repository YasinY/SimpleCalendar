import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { REMINDER_CHECK_INTERVAL_MS } from '../../../../src/main/constants';
import { ReminderScheduler } from '../../../../src/main/reminders/ReminderScheduler';
import { openCalendarDatabase, type CalendarDatabase } from '../../../../src/main/storage/database';
import { EventStore } from '../../../../src/main/storage/EventStore';
import type { ReminderNotifier } from '../../../../src/main/reminders/reminderNotifier';
import type { CalendarEvent } from '../../../../src/shared/calendarEvent';
import type { DateRange } from '../../../../src/shared/dateRange';

const IN_MEMORY = ':memory:';
const NOW = new Date(2026, 8, 16, 9, 0, 0, 0);
const TODAY = '2026-09-16';
const TODAY_RANGE: DateRange = { from: TODAY, to: TODAY };
const REMINDER_MINUTES = 10;
const DUE_TIME = '09:05';
const LATER_TIME = '18:00';
const MINUTES_UNTIL_LATER_IS_DUE = 9 * 60;
const MILLISECONDS_PER_MINUTE = 60000;

let database: CalendarDatabase;
let store: EventStore;
let notify: Mock<ReminderNotifier>;
let scheduler: ReminderScheduler;

function findEvent(id: string): CalendarEvent | undefined {
  return store.getBetween(TODAY_RANGE).find((event) => event.id === id);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  database = openCalendarDatabase(IN_MEMORY);
  store = new EventStore(database);
  notify = vi.fn();
  scheduler = new ReminderScheduler(store, notify);
});

afterEach(() => {
  scheduler.stop();
  database.$client.close();
  vi.useRealTimers();
});

describe('ReminderScheduler with the sqlite store', () => {
  it('notifies due reminders once and persists the notified flag', () => {
    const due = store.save({ date: TODAY, time: DUE_TIME, title: 'due', reminderMinutes: REMINDER_MINUTES });
    const later = store.save({ date: TODAY, time: LATER_TIME, title: 'later', reminderMinutes: REMINDER_MINUTES });
    store.save({ date: TODAY, time: DUE_TIME, title: 'silent' });

    scheduler.start();
    vi.advanceTimersByTime(REMINDER_CHECK_INTERVAL_MS);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].id).toBe(due.id);
    expect(findEvent(due.id)?.notified).toBe(true);
    expect(findEvent(later.id)?.notified).toBe(false);
    expect(store.getPendingReminders().map((event) => event.id)).toEqual([later.id]);
  });

  it('notifies a later reminder once the clock reaches its lead time', () => {
    const later = store.save({ date: TODAY, time: LATER_TIME, title: 'later', reminderMinutes: REMINDER_MINUTES });
    scheduler.start();
    expect(notify).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MINUTES_UNTIL_LATER_IS_DUE * MILLISECONDS_PER_MINUTE);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].id).toBe(later.id);
    expect(store.getPendingReminders()).toEqual([]);
  });

  it('notifies again after an edit resets the notified flag', () => {
    const due = store.save({ date: TODAY, time: DUE_TIME, title: 'due', reminderMinutes: REMINDER_MINUTES });
    scheduler.check();
    store.save({ id: due.id, date: TODAY, time: DUE_TIME, title: 'edited', reminderMinutes: REMINDER_MINUTES });

    scheduler.check();

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls[1][0].title).toBe('edited');
    expect(findEvent(due.id)?.notified).toBe(true);
  });
});
