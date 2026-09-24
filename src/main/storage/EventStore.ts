import { randomUUID } from 'node:crypto';
import { and, asc, between, eq, isNotNull } from 'drizzle-orm';
import { toStoredColor, toStoredEndTime, toStoredReminder, toStoredText } from './eventNormalization';
import { events } from './schema';
import type { CalendarDatabase } from './database';
import type { CalendarEvent } from '../../shared/calendarEvent';
import type { DateRange } from '../../shared/dateRange';
import type { EventInput } from '../../shared/eventInput';

const NO_EVENT_ID = '';
const NO_CHANGES = 0;

export class EventStore {
  readonly #database: CalendarDatabase;

  constructor(database: CalendarDatabase) {
    this.#database = database;
  }

  getBetween({ from, to }: DateRange): CalendarEvent[] {
    return this.#database
      .select()
      .from(events)
      .where(between(events.date, from, to))
      .orderBy(asc(events.date), asc(events.time))
      .all();
  }

  getPendingReminders(): CalendarEvent[] {
    return this.#database
      .select()
      .from(events)
      .where(and(eq(events.notified, false), isNotNull(events.reminderMinutes)))
      .all();
  }

  save(input: EventInput): CalendarEvent {
    const existing = this.#find(input.id ?? NO_EVENT_ID);
    const event: CalendarEvent = {
      id: existing?.id ?? randomUUID(),
      date: input.date,
      time: input.time,
      endTime: toStoredEndTime(input.time, input.endTime),
      allDay: input.allDay === true,
      title: toStoredText(input.title),
      notes: toStoredText(input.notes),
      color: toStoredColor(input.color),
      reminderMinutes: toStoredReminder(input.reminderMinutes),
      notified: false
    };
    this.#database.insert(events).values(event).onConflictDoUpdate({ target: events.id, set: event }).run();
    return event;
  }

  delete(id: string): boolean {
    return this.#database.delete(events).where(eq(events.id, id)).run().changes > NO_CHANGES;
  }

  markNotified(id: string): void {
    this.#database.update(events).set({ notified: true }).where(eq(events.id, id)).run();
  }

  importAll(imported: CalendarEvent[]): void {
    this.#database.transaction((transaction) => {
      for (const event of imported) {
        transaction.insert(events).values(event).onConflictDoNothing().run();
      }
    });
  }

  #find(id: string): CalendarEvent | undefined {
    return this.#database.select().from(events).where(eq(events.id, id)).get();
  }
}
