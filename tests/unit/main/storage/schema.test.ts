import { describe, expect, it } from 'vitest';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { events } from '../../../../src/main/storage/schema';

const TABLE_NAME = 'events';
const DATE_INDEX_NAME = 'events_date_idx';
const DATE_COLUMN_NAME = 'date';

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
