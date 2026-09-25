import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const EVENTS_TABLE_NAME = 'events';
const EXCEPTIONS_TABLE_NAME = 'event_exceptions';
const DATE_INDEX_NAME = 'events_date_idx';
const EMPTY_TEXT = '';
const DEFAULT_RECURRENCE_INTERVAL = 1;

export const events = sqliteTable(
  EVENTS_TABLE_NAME,
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    endDate: text('end_date'),
    time: text('time').notNull(),
    endTime: text('end_time'),
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(EMPTY_TEXT),
    color: text('color'),
    reminderMinutes: integer('reminder_minutes'),
    recurrenceFrequency: text('recurrence_frequency'),
    recurrenceInterval: integer('recurrence_interval').notNull().default(DEFAULT_RECURRENCE_INTERVAL),
    recurrenceUntil: text('recurrence_until'),
    notifiedOccurrence: text('notified_occurrence')
  },
  (table) => [index(DATE_INDEX_NAME).on(table.date)]
);

export const eventExceptions = sqliteTable(
  EXCEPTIONS_TABLE_NAME,
  {
    seriesId: text('series_id').notNull(),
    occurrenceDate: text('occurrence_date').notNull()
  },
  (table) => [primaryKey({ columns: [table.seriesId, table.occurrenceDate] })]
);
