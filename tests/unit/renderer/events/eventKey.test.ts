import { describe, expect, it } from 'vitest';
import { toEventKey } from '@renderer/events/eventKey';
import { EVENT_KEY_SEPARATOR } from '@renderer/constants';

const EVENT_ID = 'series-1';
const DATE = '2026-09-16';

describe('toEventKey', () => {
  it('joins id and date so occurrences of one series stay distinct', () => {
    expect(toEventKey({ id: EVENT_ID, date: DATE })).toBe(EVENT_ID + EVENT_KEY_SEPARATOR + DATE);
  });
});
