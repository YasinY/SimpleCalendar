import type { events } from './schema';

export type StoredEvent = typeof events.$inferSelect;

export type StoredRecurrence = Pick<StoredEvent, 'recurrenceFrequency' | 'recurrenceInterval' | 'recurrenceUntil'>;
