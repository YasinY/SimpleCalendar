import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEGACY_EVENTS_FILE_NAME, LEGACY_EVENTS_MIGRATED_SUFFIX, SETTINGS_FILE_NAME } from '@main/constants';
import { openStorage } from '@main/storage/openStorage';
import { DEFAULT_SETTINGS } from '@shared/settingsDefaults';
import type { CalendarStorage } from '@main/storage/calendarStorage';
import type { DateRange } from '@shared/dateRange';

const USER_DATA_PREFIX = 'simplecalendar-bootstrap-';
const JANUARY: DateRange = { from: '2026-01-01', to: '2026-01-31' };
const REFERENCE_DATE = '2026-01-31';
const LEGACY_EVENTS = [
  { id: 'legacy-1', date: '2026-01-05', time: '10:00', title: '  Zahnarzt ', color: 'red', reminderMinutes: 15 },
  { id: 'legacy-2', date: '2026-01-07', time: '08:00', title: 'Erledigt', reminderMinutes: 5, notified: true },
  { date: '2026-01-06', time: '09:00', endTime: '10:00', title: 'Ohne Id', notes: 'Notiz' }
];
const STORED_SETTINGS = { theme: 'dark', holidayRegion: 'BY', unknown: true };

let userData: string;
let openSessions: CalendarStorage[];

function startSession(): CalendarStorage {
  const storage = openStorage(userData);
  openSessions.push(storage);
  return storage;
}

function shutdown(storage: CalendarStorage): void {
  openSessions = openSessions.filter((open) => open !== storage);
  storage.database.$client.close();
}

beforeEach(() => {
  userData = mkdtempSync(path.join(tmpdir(), USER_DATA_PREFIX));
  openSessions = [];
  writeFileSync(path.join(userData, LEGACY_EVENTS_FILE_NAME), JSON.stringify(LEGACY_EVENTS));
  writeFileSync(path.join(userData, SETTINGS_FILE_NAME), JSON.stringify(STORED_SETTINGS));
});

afterEach(() => {
  for (const storage of [...openSessions]) shutdown(storage);
  rmSync(userData, { recursive: true, force: true });
});

describe('openStorage across restarts', () => {
  it('imports legacy events once, normalizes them and keeps them after a restart', () => {
    const first = startSession();
    const imported = first.events.getBetween(JANUARY);

    expect(imported).toHaveLength(LEGACY_EVENTS.length);
    expect(imported[0]).toMatchObject({ id: 'legacy-1', title: 'Zahnarzt', color: 'red', reminderMinutes: 15, endDate: null, recurrence: null, notified: false });
    expect(imported[1]).toMatchObject({ title: 'Ohne Id', endTime: '10:00', notes: 'Notiz', allDay: false, color: null });
    expect(imported[1].id).not.toHaveLength(0);
    expect(imported[2]).toMatchObject({ id: 'legacy-2', title: 'Erledigt', notified: true });
    expect(existsSync(path.join(userData, LEGACY_EVENTS_FILE_NAME))).toBe(false);
    expect(existsSync(path.join(userData, LEGACY_EVENTS_FILE_NAME + LEGACY_EVENTS_MIGRATED_SUFFIX))).toBe(true);

    shutdown(first);
    const second = startSession();

    expect(second.events.getBetween(JANUARY)).toEqual(imported);
  });

  it('merges stored settings over defaults and persists updates for the next start', () => {
    const first = startSession();
    expect(first.settings.getAll()).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', holidayRegion: 'BY' });

    first.settings.update({ weatherCity: 'Hamburg', viewMode: 'week' });
    shutdown(first);
    const second = startSession();

    expect(second.settings.getAll()).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
      holidayRegion: 'BY',
      weatherCity: 'Hamburg',
      viewMode: 'week'
    });
  });

  it('keeps events saved in one session visible in the next', () => {
    const first = startSession();
    const saved = first.events.save({ date: '2026-01-20', time: '14:00', title: 'Neu' });
    first.events.markNotified(saved.id, saved.date);
    shutdown(first);

    const second = startSession();
    const reloaded = second.events.getBetween(JANUARY).find((event) => event.id === saved.id);

    expect(reloaded).toEqual({ ...saved, notified: true });
    expect(second.events.getPendingReminders(REFERENCE_DATE).map((event) => event.id)).toEqual(['legacy-1']);
  });
});
