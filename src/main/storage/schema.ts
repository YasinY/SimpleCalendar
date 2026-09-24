import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const TABLE_NAME = 'events';
const DATE_INDEX_NAME = 'events_date_idx';
const EMPTY_TEXT = '';

export const events = sqliteTable(
  TABLE_NAME,
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    time: text('time').notNull(),
    endTime: text('end_time'),
    allDay: integer('all_day', { mode: 'boolean' }).notNull().default(false),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(EMPTY_TEXT),
    color: text('color'),
    reminderMinutes: integer('reminder_minutes'),
    notified: integer('notified', { mode: 'boolean' }).notNull().default(false)
  },
  (table) => [index(DATE_INDEX_NAME).on(table.date)]
);
