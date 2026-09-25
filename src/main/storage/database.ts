import { drizzle } from 'drizzle-orm/node-sqlite';
import { migrate } from 'drizzle-orm/node-sqlite/migrator';
import { MIGRATIONS_PATH } from '@main/constants';

const WAL_PRAGMA = 'PRAGMA journal_mode = WAL';

export type CalendarDatabase = ReturnType<typeof drizzle>;

export function openCalendarDatabase(filePath: string): CalendarDatabase {
  const database = drizzle({ connection: filePath });
  const client = database.$client;
  try {
    client.exec(WAL_PRAGMA);
    migrate(database, { migrationsFolder: MIGRATIONS_PATH });
  } catch (error) {
    client.close();
    throw error;
  }
  return database;
}
