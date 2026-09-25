import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { eventExceptions, events } from '@main/storage/schema';

const TABLE_NAME = 'events';
const DATE_INDEX_NAME = 'events_date_idx';
const DATE_COLUMN_NAME = 'date';
const EXCEPTIONS_TABLE_NAME = 'event_exceptions';
const EXCEPTION_KEY_COLUMN_NAMES = ['series_id', 'occurrence_date'];

describe('events schema', () => {
  it('defines the events table with an index on the date column', () => {
    const { name, indexes } = getTableConfig(events);
    const [dateIndex] = indexes;
    const indexColumns = dateIndex.config.columns.map((column) => ('name' in column ? column.name : column));

    expect(name).toBe(TABLE_NAME);
    expect(indexes).toHaveLength(1);
    expect(dateIndex.config.name).toBe(DATE_INDEX_NAME);
    expect(indexColumns).toEqual([DATE_COLUMN_NAME]);
  });
});

describe('event exceptions schema', () => {
  it('defines the exceptions table with a composite primary key of series and occurrence date', () => {
    const { name, primaryKeys } = getTableConfig(eventExceptions);
    const [primaryKey] = primaryKeys;

    expect(name).toBe(EXCEPTIONS_TABLE_NAME);
    expect(primaryKeys).toHaveLength(1);
    expect(primaryKey.columns.map((column) => column.name)).toEqual(EXCEPTION_KEY_COLUMN_NAMES);
  });
});
