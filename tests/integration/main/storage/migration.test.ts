import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MIGRATIONS_PATH } from '@main/constants';
import { openCalendarDatabase, type CalendarDatabase } from '@main/storage/database';
import { EventStore } from '@main/storage/EventStore';
import type { DateRange } from '@shared/dateRange';

const DIRECTORY_PREFIX = 'simplecalendar-migration-';
const DATABASE_FILE_NAME = 'calendar.db';
const MIGRATIONS_DIR_NAME = 'migrations';
const INITIAL_MIGRATION_NAME = '20260916105100_init';
const EVENT_DATE = '2026-09-16';
const EVENT_TIME = '09:00';
const REMINDER_MINUTES = 15;
const NOTIFIED_ID = 'already-notified';
const PENDING_ID = 'still-pending';
const SEPTEMBER: DateRange = { from: '2026-09-01', to: '2026-09-30' };

const LEGACY_INSERT = `INSERT INTO events (id, date, time, title, reminder_minutes, notified) VALUES
  ('${NOTIFIED_ID}', '${EVENT_DATE}', '${EVENT_TIME}', 'Alt', ${REMINDER_MINUTES}, 1),
  ('${PENDING_ID}', '${EVENT_DATE}', '${EVENT_TIME}', 'Offen', ${REMINDER_MINUTES}, 0)`;

let directory: string;
let database: CalendarDatabase | null;

function createLegacyDatabase(databasePath: string): void {
  const migrationsFolder = path.join(directory, MIGRATIONS_DIR_NAME);
  mkdirSync(migrationsFolder);
  cpSync(path.join(MIGRATIONS_PATH, INITIAL_MIGRATION_NAME), path.join(migrationsFolder, INITIAL_MIGRATION_NAME), { recursive: true });
  const legacy = drizzle({ connection: databasePath });
  migrate(legacy, { migrationsFolder });
  legacy.$client.exec(LEGACY_INSERT);
  legacy.$client.close();
}

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), DIRECTORY_PREFIX));
  database = null;
});

afterEach(() => {
  database?.$client.close();
  rmSync(directory, { recursive: true, force: true });
});

describe('migration from the initial schema', () => {
  it('turns the old notified flag into a notified occurrence and keeps the other events pending', () => {
    const databasePath = path.join(directory, DATABASE_FILE_NAME);
    createLegacyDatabase(databasePath);

    database = openCalendarDatabase(databasePath);
    const store = new EventStore(database);
    const notifiedById = Object.fromEntries(store.getBetween(SEPTEMBER).map((event) => [event.id, event.notified]));

    expect(notifiedById).toEqual({ [NOTIFIED_ID]: true, [PENDING_ID]: false });
    expect(store.getPendingReminders(EVENT_DATE).map((event) => event.id)).toEqual([PENDING_ID]);
  });
});
