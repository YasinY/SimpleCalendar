import type { CalendarEvent } from '../../src/shared/calendarEvent';

const DEFAULT_EVENT: CalendarEvent = {
  id: 'event-1',
  date: '2026-09-16',
  time: '09:00',
  endTime: null,
  allDay: false,
  title: 'Test',
  notes: '',
  color: null,
  reminderMinutes: null,
  notified: false
};

export function createCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return { ...DEFAULT_EVENT, ...overrides };
}
