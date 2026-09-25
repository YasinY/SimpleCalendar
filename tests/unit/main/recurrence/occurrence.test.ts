import { describe, expect, it } from 'vitest';
import { toOccurrence, toRecurrence } from '@main/recurrence/occurrence';
import type { StoredEvent } from '@main/storage/storedEvent';

const SERIES_START = '2026-09-01';
const SERIES_END = '2026-09-03';
const OCCURRENCE_DATE = '2026-09-08';
const OCCURRENCE_END = '2026-09-10';
const WEEKLY = 'weekly';
const INTERVAL = 2;
const UNTIL = '2026-12-31';

const STORED_EVENT: StoredEvent = {
  id: 'series-1',
  date: SERIES_START,
  endDate: null,
  time: '09:00',
  endTime: '10:00',
  allDay: false,
  title: 'Serie',
  notes: 'Notiz',
  color: '#ff0000',
  reminderMinutes: 15,
  recurrenceFrequency: null,
  recurrenceInterval: 1,
  recurrenceUntil: null,
  notifiedOccurrence: null
};

function storedEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return { ...STORED_EVENT, ...overrides };
}

const RECURRING_EVENT = storedEvent({ recurrenceFrequency: WEEKLY, recurrenceInterval: INTERVAL, recurrenceUntil: UNTIL });
const EXPECTED_RECURRENCE = { frequency: WEEKLY, interval: INTERVAL, until: UNTIL };

describe('toRecurrence', () => {
  it('is null for a non-recurring event', () => {
    expect(toRecurrence(STORED_EVENT)).toBeNull();
  });

  it('maps the stored recurrence columns', () => {
    expect(toRecurrence(RECURRING_EVENT)).toEqual(EXPECTED_RECURRENCE);
  });
});

describe('toOccurrence', () => {
  it('copies the stored fields onto the occurrence date', () => {
    expect(toOccurrence(RECURRING_EVENT, OCCURRENCE_DATE)).toEqual({
      id: RECURRING_EVENT.id,
      date: OCCURRENCE_DATE,
      endDate: null,
      time: RECURRING_EVENT.time,
      endTime: RECURRING_EVENT.endTime,
      allDay: RECURRING_EVENT.allDay,
      title: RECURRING_EVENT.title,
      notes: RECURRING_EVENT.notes,
      color: RECURRING_EVENT.color,
      reminderMinutes: RECURRING_EVENT.reminderMinutes,
      recurrence: EXPECTED_RECURRENCE,
      notified: false
    });
  });

  it('shifts the end date by the same offset as the start date', () => {
    expect(toOccurrence(storedEvent({ endDate: SERIES_END }), OCCURRENCE_DATE).endDate).toBe(OCCURRENCE_END);
  });

  it('is notified only for the notified occurrence', () => {
    const notified = storedEvent({ notifiedOccurrence: OCCURRENCE_DATE });

    expect(toOccurrence(notified, OCCURRENCE_DATE).notified).toBe(true);
    expect(toOccurrence(notified, SERIES_START).notified).toBe(false);
  });
});
