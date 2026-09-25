import path from 'node:path';
import { DATABASE_FILE_NAME, LEGACY_EVENTS_FILE_NAME, SETTINGS_FILE_NAME } from '@main/constants';
import { openCalendarDatabase } from './database';
import { EventStore } from './EventStore';
import { importLegacyEvents } from './legacyEventsImport';
import { SettingsStore } from './SettingsStore';
import { DEFAULT_SETTINGS } from '@shared/settingsDefaults';
import type { CalendarStorage } from './calendarStorage';

export function openStorage(userDataPath: string): CalendarStorage {
  const database = openCalendarDatabase(path.join(userDataPath, DATABASE_FILE_NAME));
  const events = new EventStore(database);
  importLegacyEvents(events, path.join(userDataPath, LEGACY_EVENTS_FILE_NAME));
  const settings = SettingsStore.load(path.join(userDataPath, SETTINGS_FILE_NAME), DEFAULT_SETTINGS);
  return { database, events, settings };
}
