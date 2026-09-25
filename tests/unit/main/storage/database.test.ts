import { describe, expect, it, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/node-sqlite';
import { openCalendarDatabase, type CalendarDatabase } from '@main/storage/database';

const IN_MEMORY = ':memory:';

const { migrationError } = vi.hoisted(() => ({ migrationError: new Error('migration failed') }));

vi.mock('drizzle-orm/node-sqlite/migrator', () => ({
  migrate: vi.fn(() => {
    throw migrationError;
  })
}));

vi.mock('drizzle-orm/node-sqlite', async (importOriginal) => {
  const original = await importOriginal<typeof import('drizzle-orm/node-sqlite')>();
  return { ...original, drizzle: vi.fn(original.drizzle) };
});

describe('openCalendarDatabase', () => {
  it('closes the connection and rethrows when the migration fails', () => {
    expect(() => openCalendarDatabase(IN_MEMORY)).toThrow(migrationError);

    const database = vi.mocked(drizzle).mock.results[0].value as CalendarDatabase;
    expect(database.$client.isOpen).toBe(false);
  });
});
