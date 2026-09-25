import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { REMINDER_CHECK_INTERVAL_MS } from '@main/constants';
import { ReminderScheduler } from '@main/reminders/ReminderScheduler';
import { openCalendarDatabase, type CalendarDatabase } from '@main/storage/database';
import { EventStore } from '@main/storage/EventStore';
import type { ReminderNotifier } from '@main/reminders/reminderNotifier';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { DateRange } from '@shared/dateRange';
import type { Recurrence } from '@shared/recurrence';

const IN_MEMORY = ':memory:';
const NOW = new Date(2026, 8, 16, 9, 0, 0, 0);
const TODAY = '2026-09-16';
const TODAY_RANGE: DateRange = { from: TODAY, to: TODAY };
const REMINDER_MINUTES = 10;
const DUE_TIME = '09:05';
const LATER_TIME = '18:00';
const MINUTES_UNTIL_LATER_IS_DUE = 9 * 60;
const MILLISECONDS_PER_MINUTE = 60000;
const TOMORROW = '2026-09-17';
const TOMORROW_NOW = new Date(2026, 8, 17, 9, 0, 0, 0);
const THREE_DAYS_AGO = '2026-09-13';
const DAILY: Recurrence = { frequency: 'daily', interval: 1, until: null };
const DAILY_SERIES = { date: TODAY, time: DUE_TIME, title: 'Täglich', reminderMinutes: REMINDER_MINUTES, recurrence: DAILY };

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
    expect(store.getPendingReminders(TODAY).map((event) => event.id)).toEqual([later.id]);
  });

  it('notifies a later reminder once the clock reaches its lead time', () => {
    const later = store.save({ date: TODAY, time: LATER_TIME, title: 'later', reminderMinutes: REMINDER_MINUTES });
    scheduler.start();
    expect(notify).not.toHaveBeenCalled();

    vi.advanceTimersByTime(MINUTES_UNTIL_LATER_IS_DUE * MILLISECONDS_PER_MINUTE);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].id).toBe(later.id);
    expect(store.getPendingReminders(TODAY)).toEqual([]);
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

  it('notifies a daily series once per day', () => {
    const series = store.save(DAILY_SERIES);

    scheduler.check();
    scheduler.check();
    vi.setSystemTime(TOMORROW_NOW);
    scheduler.check();
    scheduler.check();

    expect(notify.mock.calls.map(([event]) => [event.id, event.date])).toEqual([
      [series.id, TODAY],
      [series.id, TOMORROW]
    ]);
  });

  it('notifies only the latest missed occurrence of a series', () => {
    const series = store.save({ ...DAILY_SERIES, date: THREE_DAYS_AGO });

    scheduler.check();

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0].date).toBe(TODAY);
    expect(store.getPendingReminders(TODAY).map((event) => event.date)).toEqual([TOMORROW]);
    expect(findEvent(series.id)?.notified).toBe(true);
  });

  it('notifies a series occurrence again after the series was edited', () => {
    const series = store.save(DAILY_SERIES);
    scheduler.check();

    store.save({ ...DAILY_SERIES, id: series.id, occurrenceDate: TODAY, title: 'Bearbeitet' });
    scheduler.check();

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls[1][0]).toMatchObject({ id: series.id, date: TODAY, title: 'Bearbeitet' });
  });

  it('does not notify a deleted occurrence of a series', () => {
    const series = store.save(DAILY_SERIES);
    store.deleteOccurrence({ id: series.id, occurrenceDate: TODAY });

    scheduler.check();

    expect(notify).not.toHaveBeenCalled();
  });
});
