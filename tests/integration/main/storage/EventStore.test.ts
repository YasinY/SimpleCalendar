import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openCalendarDatabase, type CalendarDatabase } from '@main/storage/database';
import { normalizeStoredEvent } from '@main/storage/eventNormalization';
import { EventStore } from '@main/storage/EventStore';
import { importLegacyEvents } from '@main/storage/legacyEventsImport';
import type { DateRange } from '@shared/dateRange';
import type { EventInput } from '@shared/eventInput';
import type { Recurrence } from '@shared/recurrence';

const IN_MEMORY = ':memory:';
const SEPTEMBER: DateRange = { from: '2026-09-01', to: '2026-09-30' };
const JANUARY: DateRange = { from: '2026-01-01', to: '2026-01-31' };
const SEPTEMBER_FIRST = '2026-09-01';
const SEPTEMBER_THIRD = '2026-09-03';
const SEPTEMBER_EIGHTH = '2026-09-08';
const SEPTEMBER_FIFTEENTH = '2026-09-15';
const SEPTEMBER_SEVENTEENTH = '2026-09-17';
const SEPTEMBER_TWENTY_SECOND = '2026-09-22';
const SEPTEMBER_TWENTY_NINTH = '2026-09-29';
const WEEKLY: Recurrence = { frequency: 'weekly', interval: 1, until: null };
const DAILY: Recurrence = { frequency: 'daily', interval: 1, until: null };
const WEEKLY_DATES = [SEPTEMBER_FIRST, SEPTEMBER_EIGHTH, SEPTEMBER_FIFTEENTH, SEPTEMBER_TWENTY_SECOND, SEPTEMBER_TWENTY_NINTH];
const SERIES_INPUT: EventInput = { date: SEPTEMBER_FIRST, time: '09:00', title: 'Serie', recurrence: WEEKLY };
const REMINDER_MINUTES = 10;
const TWO_DAYS_IN_MINUTES = 2880;
const UNKNOWN_ID = 'unknown';

let directory: string;
let openDatabases: CalendarDatabase[];

function createStore(filePath = IN_MEMORY): EventStore {
  const database = openCalendarDatabase(filePath);
  openDatabases.push(database);
  return new EventStore(database);
}

function datesBetween(store: EventStore, range: DateRange = SEPTEMBER): string[] {
  return store.getBetween(range).map((event) => event.date);
}

function pendingDates(store: EventStore, referenceDate: string): string[] {
  return store.getPendingReminders(referenceDate).map((event) => event.date);
}

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), 'simplecalendar-store-'));
  openDatabases = [];
});

afterEach(() => {
  for (const database of openDatabases) database.$client.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('EventStore', () => {
  it('saves a new event with defaults and persists it to disk', () => {
    const filePath = path.join(directory, 'calendar.db');
    const saved = createStore(filePath).save({ date: '2026-09-16', time: '09:00', title: '  Test  ' });

    expect(saved.title).toBe('Test');
    expect(saved.endDate).toBeNull();
    expect(saved.endTime).toBeNull();
    expect(saved.allDay).toBe(false);
    expect(saved.notes).toBe('');
    expect(saved.color).toBeNull();
    expect(saved.reminderMinutes).toBeNull();
    expect(saved.recurrence).toBeNull();
    expect(createStore(filePath).getBetween(SEPTEMBER)).toEqual([saved]);
  });

  it('drops an end time that is not after the start time', () => {
    const store = createStore();
    expect(store.save({ date: '2026-09-16', time: '09:00', endTime: '08:00', title: 'x' }).endTime).toBeNull();
    expect(store.save({ date: '2026-09-16', time: '09:00', endTime: '10:00', title: 'x' }).endTime).toBe('10:00');
  });

  it('keeps an earlier end time on the last day of a multi-day event', () => {
    const saved = createStore().save({ date: '2026-09-16', endDate: '2026-09-18', time: '22:00', endTime: '08:00', title: 'Reise' });

    expect(saved.endDate).toBe('2026-09-18');
    expect(saved.endTime).toBe('08:00');
  });

  it('updates an existing event by id and resets the notified flag', () => {
    const store = createStore();
    const created = store.save({ date: '2026-09-16', time: '09:00', title: 'Alt', reminderMinutes: 5 });
    store.markNotified(created.id, created.date);
    const updated = store.save({ id: created.id, date: created.date, time: '19:00', title: 'Neu' });

    expect(updated.id).toBe(created.id);
    expect(updated.notified).toBe(false);
    expect(store.getBetween(SEPTEMBER)).toEqual([updated]);
  });

  it('creates a new event when the given id is unknown', () => {
    const saved = createStore().save({ id: UNKNOWN_ID, date: '2026-09-16', time: '09:00', title: 'x' });

    expect(saved.id).not.toBe(UNKNOWN_ID);
  });

  it('deletes events and reports unknown ids', () => {
    const store = createStore();
    const event = store.save({ date: '2026-09-16', time: '09:00', title: 'x' });
    expect(store.delete(event.id)).toBe(true);
    expect(store.delete(event.id)).toBe(false);
    expect(store.getBetween(SEPTEMBER)).toHaveLength(0);
  });

  it('returns only events inside the range, ordered by date and time', () => {
    const store = createStore();
    const late = store.save({ date: '2026-09-20', time: '08:00', title: 'late' });
    const early = store.save({ date: '2026-09-02', time: '18:00', title: 'early' });
    const earlier = store.save({ date: '2026-09-02', time: '07:30', title: 'earlier' });
    store.save({ date: '2026-10-01', time: '09:00', title: 'outside' });
    store.save({ date: '2026-08-31', time: '09:00', title: 'before' });

    expect(store.getBetween(SEPTEMBER)).toEqual([earlier, early, late]);
  });

  it('includes multi-day events that start before the range and end inside it', () => {
    const store = createStore();
    const overlapping = store.save({ date: '2026-08-30', endDate: '2026-09-02', time: '09:00', title: 'Urlaub' });
    store.save({ date: '2026-08-25', endDate: '2026-08-31', time: '09:00', title: 'vorbei' });

    expect(store.getBetween(SEPTEMBER)).toEqual([overlapping]);
  });

  it('lists only unnotified events that carry a reminder', () => {
    const store = createStore();
    const pending = store.save({ date: '2026-09-16', time: '09:00', title: 'pending', reminderMinutes: REMINDER_MINUTES });
    const notified = store.save({ date: '2026-09-16', time: '10:00', title: 'done', reminderMinutes: REMINDER_MINUTES });
    store.save({ date: '2026-09-16', time: '11:00', title: 'silent' });
    store.markNotified(notified.id, notified.date);

    expect(store.getPendingReminders('2026-09-16')).toEqual([pending]);
  });
});

describe('EventStore series', () => {
  it('expands a recurring series into its occurrences inside the range', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);

    expect(series.recurrence).toEqual(WEEKLY);
    expect(datesBetween(store)).toEqual(WEEKLY_DATES);
    expect(store.getBetween(SEPTEMBER).every((event) => event.id === series.id)).toBe(true);
  });

  it('expands a series that started before the range and ignores ended series', () => {
    const store = createStore();
    store.save({ ...SERIES_INPUT, date: '2026-08-25' });
    store.save({ ...SERIES_INPUT, date: '2026-08-01', recurrence: { ...WEEKLY, until: '2026-08-31' } });

    expect(datesBetween(store)).toEqual(WEEKLY_DATES);
  });

  it('skips deleted occurrences and keeps deleting an occurrence idempotent', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);

    expect(store.deleteOccurrence({ id: series.id, occurrenceDate: SEPTEMBER_EIGHTH })).toBe(true);
    expect(store.deleteOccurrence({ id: series.id, occurrenceDate: SEPTEMBER_EIGHTH })).toBe(true);
    expect(store.deleteOccurrence({ id: series.id, occurrenceDate: SEPTEMBER_TWENTY_SECOND })).toBe(true);

    expect(datesBetween(store)).toEqual([SEPTEMBER_FIRST, SEPTEMBER_FIFTEENTH, SEPTEMBER_TWENTY_NINTH]);
  });

  it('deletes a non-recurring event when one of its occurrences is deleted', () => {
    const store = createStore();
    const single = store.save({ date: SEPTEMBER_FIRST, time: '09:00', title: 'x' });

    expect(store.deleteOccurrence({ id: single.id, occurrenceDate: SEPTEMBER_FIRST })).toBe(true);
    expect(store.deleteOccurrence({ id: single.id, occurrenceDate: SEPTEMBER_FIRST })).toBe(false);
    expect(store.getBetween(SEPTEMBER)).toEqual([]);
  });

  it('detaches an edited occurrence into a standalone event', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);

    const detached = store.saveOccurrence({ ...SERIES_INPUT, id: series.id, occurrenceDate: SEPTEMBER_EIGHTH, date: '2026-09-09', title: 'Verschoben' });

    expect(detached.id).not.toBe(series.id);
    expect(detached.recurrence).toBeNull();
    expect(detached.date).toBe('2026-09-09');
    expect(datesBetween(store)).toEqual([SEPTEMBER_FIRST, '2026-09-09', SEPTEMBER_FIFTEENTH, SEPTEMBER_TWENTY_SECOND, SEPTEMBER_TWENTY_NINTH]);
  });

  it('falls back to saving the whole event when no series occurrence is addressed', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);
    const single = store.save({ date: SEPTEMBER_FIRST, time: '10:00', title: 'Einzeln' });

    const updatedSeries = store.saveOccurrence({ ...SERIES_INPUT, id: series.id, title: 'Serie neu' });
    const updatedSingle = store.saveOccurrence({ id: single.id, occurrenceDate: SEPTEMBER_FIRST, date: SEPTEMBER_THIRD, time: '10:00', title: 'Einzeln' });

    expect(updatedSeries).toMatchObject({ id: series.id, title: 'Serie neu', recurrence: WEEKLY });
    expect(updatedSingle).toMatchObject({ id: single.id, date: SEPTEMBER_THIRD });
  });

  it('keeps the series start when an occurrence is edited in place', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);

    const updated = store.save({ ...SERIES_INPUT, id: series.id, occurrenceDate: SEPTEMBER_FIFTEENTH, date: SEPTEMBER_FIFTEENTH, title: 'Neu' });

    expect(updated.date).toBe(SEPTEMBER_FIRST);
    expect(datesBetween(store)).toEqual(WEEKLY_DATES);
  });

  it('shifts the whole series when an occurrence is moved to another day', () => {
    const store = createStore();
    const series = store.save({ ...SERIES_INPUT, endDate: '2026-09-02' });

    const moved = store.save({ ...SERIES_INPUT, id: series.id, occurrenceDate: SEPTEMBER_FIFTEENTH, date: SEPTEMBER_SEVENTEENTH, endDate: '2026-09-18' });

    expect(moved.date).toBe(SEPTEMBER_THIRD);
    expect(moved.endDate).toBe('2026-09-04');
    expect(datesBetween(store)).toEqual([SEPTEMBER_THIRD, '2026-09-10', SEPTEMBER_SEVENTEENTH, '2026-09-24']);
  });

  it('uses the input date as series start when no occurrence date is given', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);

    expect(store.save({ ...SERIES_INPUT, id: series.id, date: SEPTEMBER_THIRD }).date).toBe(SEPTEMBER_THIRD);
  });

  it('clears the exceptions of a series when it stops recurring', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);
    store.deleteOccurrence({ id: series.id, occurrenceDate: SEPTEMBER_EIGHTH });

    store.save({ ...SERIES_INPUT, id: series.id, recurrence: null });
    store.save({ ...SERIES_INPUT, id: series.id });

    expect(datesBetween(store)).toEqual(WEEKLY_DATES);
  });

  it('removes the exceptions of a deleted series', () => {
    const store = createStore();
    const series = store.save(SERIES_INPUT);
    store.deleteOccurrence({ id: series.id, occurrenceDate: SEPTEMBER_EIGHTH });

    expect(store.delete(series.id)).toBe(true);
    store.importAll([normalizeStoredEvent({ ...series })]);

    expect(datesBetween(store)).toEqual(WEEKLY_DATES);
  });
});

describe('EventStore pending reminders', () => {
  it('lists every unnotified occurrence up to the reminder lookahead', () => {
    const store = createStore();
    store.save({ date: SEPTEMBER_FIRST, time: '09:00', title: 'Täglich', reminderMinutes: REMINDER_MINUTES, recurrence: DAILY });

    expect(pendingDates(store, SEPTEMBER_THIRD)).toEqual([SEPTEMBER_FIRST, '2026-09-02', SEPTEMBER_THIRD, '2026-09-04']);
  });

  it('lists only occurrences after the notified one', () => {
    const store = createStore();
    const series = store.save({ date: SEPTEMBER_FIRST, time: '09:00', title: 'Täglich', reminderMinutes: REMINDER_MINUTES, recurrence: DAILY });
    store.markNotified(series.id, SEPTEMBER_THIRD);

    expect(pendingDates(store, SEPTEMBER_THIRD)).toEqual(['2026-09-04']);
  });

  it('looks further ahead for reminders longer than a day and skips deleted occurrences', () => {
    const store = createStore();
    const series = store.save({ date: SEPTEMBER_FIRST, time: '09:00', title: 'Täglich', reminderMinutes: TWO_DAYS_IN_MINUTES, recurrence: DAILY });
    store.markNotified(series.id, SEPTEMBER_THIRD);
    store.deleteOccurrence({ id: series.id, occurrenceDate: '2026-09-04' });

    expect(pendingDates(store, SEPTEMBER_THIRD)).toEqual(['2026-09-05']);
  });
});

describe('importLegacyEvents', () => {
  it('imports and normalizes events from the old json file, then renames it', () => {
    const jsonPath = path.join(directory, 'events.json');
    writeFileSync(jsonPath, JSON.stringify([{ id: 'legacy', date: '2026-01-01', time: '10:00', title: 'Alt', notified: true }]));
    const store = createStore();

    importLegacyEvents(store, jsonPath);

    expect(store.getBetween(JANUARY)).toEqual([
      {
        id: 'legacy',
        date: '2026-01-01',
        endDate: null,
        time: '10:00',
        endTime: null,
        allDay: false,
        title: 'Alt',
        notes: '',
        color: null,
        reminderMinutes: null,
        recurrence: null,
        notified: true
      }
    ]);
    expect(existsSync(jsonPath)).toBe(false);
    expect(existsSync(jsonPath + '.migrated')).toBe(true);
  });

  it('ignores a missing file and leaves a corrupt file untouched', () => {
    const store = createStore();
    const jsonPath = path.join(directory, 'events.json');

    importLegacyEvents(store, path.join(directory, 'missing.json'));
    writeFileSync(jsonPath, '{not json');
    importLegacyEvents(store, jsonPath);

    expect(store.getBetween(JANUARY)).toEqual([]);
    expect(existsSync(jsonPath)).toBe(true);
  });
});
