import fs from 'node:fs';
import { normalizeStoredEvent } from './eventNormalization';
import { readJsonFile } from './jsonFile';
import { LEGACY_EVENTS_MIGRATED_SUFFIX } from '@main/constants';
import type { EventStore } from './EventStore';
import type { CalendarEvent } from '@shared/calendarEvent';

export function importLegacyEvents(store: EventStore, jsonPath: string): void {
  const parsed = readJsonFile<unknown>(jsonPath, null);
  if (!Array.isArray(parsed)) return;
  store.importAll(parsed.map((raw) => normalizeStoredEvent(raw as Partial<CalendarEvent>)));
  fs.renameSync(jsonPath, jsonPath + LEGACY_EVENTS_MIGRATED_SUFFIX);
}
