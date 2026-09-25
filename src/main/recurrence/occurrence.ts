import { daysBetween, shiftIsoDate } from '@shared/isoDate';
import type { StoredEvent } from '@main/storage/storedEvent';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { Recurrence } from '@shared/recurrence';
import type { RecurrenceFrequency } from '@shared/recurrenceFrequency';

export function toRecurrence({ recurrenceFrequency, recurrenceInterval, recurrenceUntil }: StoredEvent): Recurrence | null {
  if (recurrenceFrequency === null) return null;
  return { frequency: recurrenceFrequency as RecurrenceFrequency, interval: recurrenceInterval, until: recurrenceUntil };
}

export function toOccurrence(stored: StoredEvent, occurrenceDate: string): CalendarEvent {
  const dayShift = daysBetween(stored.date, occurrenceDate);
  return {
    id: stored.id,
    date: occurrenceDate,
    endDate: stored.endDate === null ? null : shiftIsoDate(stored.endDate, dayShift),
    time: stored.time,
    endTime: stored.endTime,
    allDay: stored.allDay,
    title: stored.title,
    notes: stored.notes,
    color: stored.color,
    reminderMinutes: stored.reminderMinutes,
    recurrence: toRecurrence(stored),
    notified: stored.notifiedOccurrence === occurrenceDate
  };
}
