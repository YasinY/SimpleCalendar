import type { CalendarDatabase } from './database';
import type { EventStore } from './EventStore';
import type { SettingsStore } from './SettingsStore';

export interface CalendarStorage {
  database: CalendarDatabase;
  events: EventStore;
  settings: SettingsStore;
}
