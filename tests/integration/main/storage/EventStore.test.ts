import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openCalendarDatabase, type CalendarDatabase } from '../../../../src/main/storage/database';
import { EventStore } from '../../../../src/main/storage/EventStore';
import { importLegacyEvents } from '../../../../src/main/storage/legacyEventsImport';
import type { DateRange } from '../../../../src/shared/dateRange';

const IN_MEMORY = ':memory:';
const SEPTEMBER: DateRange = { from: '2026-09-01', to: '2026-09-30' };
const JANUARY: DateRange = { from: '2026-01-01', to: '2026-01-31' };

let directory: string;
let openDatabases: CalendarDatabase[];

function createStore(filePath = IN_MEMORY): EventStore {
  const database = openCalendarDatabase(filePath);
  openDatabases.push(database);
  return new EventStore(database);
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
    expect(saved.endTime).toBeNull();
    expect(saved.allDay).toBe(false);
    expect(saved.notes).toBe('');
    expect(saved.color).toBeNull();
    expect(saved.reminderMinutes).toBeNull();
    expect(createStore(filePath).getBetween(SEPTEMBER)).toEqual([saved]);
  });

  it('drops an end time that is not after the start time', () => {
    const store = createStore();
    expect(store.save({ date: '2026-09-16', time: '09:00', endTime: '08:00', title: 'x' }).endTime).toBeNull();
    expect(store.save({ date: '2026-09-16', time: '09:00', endTime: '10:00', title: 'x' }).endTime).toBe('10:00');
  });

  it('updates an existing event by id and resets the notified flag', () => {
    const store = createStore();
    const created = store.save({ date: '2026-09-16', time: '09:00', title: 'Alt', reminderMinutes: 5 });
    store.markNotified(created.id);
    const updated = store.save({ id: created.id, date: created.date, time: '19:00', title: 'Neu' });

    expect(updated.id).toBe(created.id);
    expect(updated.notified).toBe(false);
    expect(store.getBetween(SEPTEMBER)).toEqual([updated]);
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

    expect(store.getBetween(SEPTEMBER)).toEqual([earlier, early, late]);
  });

  it('lists only unnotified events that carry a reminder', () => {
    const store = createStore();
    const pending = store.save({ date: '2026-09-16', time: '09:00', title: 'pending', reminderMinutes: 10 });
    const notified = store.save({ date: '2026-09-16', time: '10:00', title: 'done', reminderMinutes: 10 });
    store.save({ date: '2026-09-16', time: '11:00', title: 'silent' });
    store.markNotified(notified.id);

    expect(store.getPendingReminders()).toEqual([pending]);
  });
});

describe('importLegacyEvents', () => {
  it('imports and normalizes events from the old json file, then renames it', () => {
    const jsonPath = path.join(directory, 'events.json');
    writeFileSync(jsonPath, JSON.stringify([{ id: 'legacy', date: '2026-01-01', time: '10:00', title: 'Alt' }]));
    const store = createStore();

    importLegacyEvents(store, jsonPath);

    expect(store.getBetween(JANUARY)).toEqual([
      {
        id: 'legacy',
        date: '2026-01-01',
        time: '10:00',
        endTime: null,
        allDay: false,
        title: 'Alt',
        notes: '',
        color: null,
        reminderMinutes: null,
        notified: false
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
