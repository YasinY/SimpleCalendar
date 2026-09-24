import { randomUUID } from 'node:crypto';
import type { CalendarEvent } from '../../shared/calendarEvent';

const EMPTY_TEXT = '';

export function toStoredEndTime(startTime: string, endTime: string | null | undefined): string | null {
  if (typeof endTime !== 'string' || endTime.length === 0) return null;
  return endTime > startTime ? endTime : null;
}

export function toStoredText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : EMPTY_TEXT;
}

export function toStoredColor(color: unknown): string | null {
  return typeof color === 'string' && color.length > 0 ? color : null;
}

export function toStoredReminder(reminderMinutes: unknown): number | null {
  return typeof reminderMinutes === 'number' && Number.isFinite(reminderMinutes) ? reminderMinutes : null;
}

export function normalizeStoredEvent(raw: Partial<CalendarEvent>): CalendarEvent {
  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : randomUUID(),
    date: raw.date ?? EMPTY_TEXT,
    time: raw.time ?? EMPTY_TEXT,
    endTime: raw.endTime ?? null,
    allDay: raw.allDay === true,
    title: toStoredText(raw.title),
    notes: toStoredText(raw.notes),
    color: toStoredColor(raw.color),
    reminderMinutes: toStoredReminder(raw.reminderMinutes),
    notified: raw.notified === true
  };
}
