import { randomUUID } from 'node:crypto';
import { and, eq, gte, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { toStoredEvent } from './eventNormalization';
import { eventExceptions, events } from './schema';
import { MINUTES_PER_DAY } from '@main/constants';
import { toOccurrence, toRecurrence } from '@main/recurrence/occurrence';
import { expandOccurrences } from '@main/recurrence/occurrences';
import { daysBetween, shiftIsoDate } from '@shared/isoDate';
import type { CalendarDatabase } from './database';
import type { StoredEvent } from './storedEvent';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { DateRange } from '@shared/dateRange';
import type { EventInput } from '@shared/eventInput';
import type { OccurrenceRef } from '@shared/occurrenceRef';

const NO_EVENT_ID = '';
const NO_CHANGES = 0;
const EARLIEST_DATE = '';
const NO_SKIPPED_DATES: ReadonlySet<string> = new Set();

type SkippedDatesBySeries = Map<string, Set<string>>;
type ExceptionWriter = Pick<CalendarDatabase, 'insert'>;

function byDateThenTime(first: CalendarEvent, second: CalendarEvent): number {
  return first.date.localeCompare(second.date) || first.time.localeCompare(second.time);
}

function resolveSeriesStart(existing: StoredEvent | undefined, input: EventInput): string {
  if (!existing || existing.recurrenceFrequency === null || typeof input.occurrenceDate !== 'string') return input.date;
  return shiftIsoDate(existing.date, daysBetween(input.occurrenceDate, input.date));
}

function insertException(writer: ExceptionWriter, { id, occurrenceDate }: OccurrenceRef): void {
  writer.insert(eventExceptions).values({ seriesId: id, occurrenceDate }).onConflictDoNothing().run();
}

export class EventStore {
  readonly #database: CalendarDatabase;

  constructor(database: CalendarDatabase) {
    this.#database = database;
  }

  getBetween(range: DateRange): CalendarEvent[] {
    const { from, to } = range;
    const overlapsRange = gte(sql`coalesce(${events.endDate}, ${events.date})`, from);
    const seriesReachesRange = and(isNotNull(events.recurrenceFrequency), or(isNull(events.recurrenceUntil), gte(events.recurrenceUntil, from)));
    const rows = this.#database
      .select()
      .from(events)
      .where(and(lte(events.date, to), or(overlapsRange, seriesReachesRange)))
      .all();
    const skipped = this.#loadSkippedDates();
    return rows.flatMap((row) => this.#occurrencesOf(row, range, skipped)).sort(byDateThenTime);
  }

  getPendingReminders(referenceDate: string): CalendarEvent[] {
    const rows = this.#database.select().from(events).where(isNotNull(events.reminderMinutes)).all();
    const skipped = this.#loadSkippedDates();
    return rows
      .flatMap((row) => {
        const lookaheadDays = Math.ceil(Number(row.reminderMinutes) / MINUTES_PER_DAY);
        const notifiedUntil = row.notifiedOccurrence ?? EARLIEST_DATE;
        const window = { from: EARLIEST_DATE, to: shiftIsoDate(referenceDate, lookaheadDays) };
        return this.#occurrencesOf(row, window, skipped).filter((occurrence) => occurrence.date > notifiedUntil);
      })
      .sort(byDateThenTime);
  }

  save(input: EventInput): CalendarEvent {
    const existing = this.#find(input.id);
    const stored = toStoredEvent(existing?.id ?? randomUUID(), resolveSeriesStart(existing, input), input);
    this.#database.transaction((transaction) => {
      transaction.insert(events).values(stored).onConflictDoUpdate({ target: events.id, set: stored }).run();
      if (stored.recurrenceFrequency === null) transaction.delete(eventExceptions).where(eq(eventExceptions.seriesId, stored.id)).run();
    });
    return toOccurrence(stored, stored.date);
  }

  saveOccurrence(input: EventInput): CalendarEvent {
    const series = this.#findSeries(input.id, input.occurrenceDate);
    if (!series) return this.save(input);
    const detached = toStoredEvent(randomUUID(), input.date, { ...input, recurrence: null });
    this.#database.transaction((transaction) => {
      insertException(transaction, series);
      transaction.insert(events).values(detached).run();
    });
    return toOccurrence(detached, detached.date);
  }

  delete(id: string): boolean {
    return this.#database.transaction((transaction) => {
      transaction.delete(eventExceptions).where(eq(eventExceptions.seriesId, id)).run();
      return transaction.delete(events).where(eq(events.id, id)).run().changes > NO_CHANGES;
    });
  }

  deleteOccurrence(ref: OccurrenceRef): boolean {
    const series = this.#findSeries(ref.id, ref.occurrenceDate);
    if (!series) return this.delete(ref.id);
    insertException(this.#database, series);
    return true;
  }

  markNotified(id: string, occurrenceDate: string): void {
    this.#database.update(events).set({ notifiedOccurrence: occurrenceDate }).where(eq(events.id, id)).run();
  }

  importAll(imported: StoredEvent[]): void {
    this.#database.transaction((transaction) => {
      for (const event of imported) {
        transaction.insert(events).values(event).onConflictDoNothing().run();
      }
    });
  }

  #find(id: string | null | undefined): StoredEvent | undefined {
    return this.#database.select().from(events).where(eq(events.id, id ?? NO_EVENT_ID)).get();
  }

  #findSeries(id: string | null | undefined, occurrenceDate: string | null | undefined): OccurrenceRef | undefined {
    if (typeof occurrenceDate !== 'string') return undefined;
    const existing = this.#find(id);
    if (!existing || existing.recurrenceFrequency === null) return undefined;
    return { id: existing.id, occurrenceDate };
  }

  #occurrencesOf(row: StoredEvent, range: DateRange, skipped: SkippedDatesBySeries): CalendarEvent[] {
    const series = { date: row.date, endDate: row.endDate, recurrence: toRecurrence(row) };
    return expandOccurrences(series, range, skipped.get(row.id) ?? NO_SKIPPED_DATES).map((date) => toOccurrence(row, date));
  }

  #loadSkippedDates(): SkippedDatesBySeries {
    const skipped: SkippedDatesBySeries = new Map();
    for (const { seriesId, occurrenceDate } of this.#database.select().from(eventExceptions).all()) {
      const dates = skipped.get(seriesId) ?? new Set<string>();
      dates.add(occurrenceDate);
      skipped.set(seriesId, dates);
    }
    return skipped;
  }
}
