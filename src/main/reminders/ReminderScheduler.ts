import { REMINDER_CHECK_INTERVAL_MS } from '@main/constants';
import { findLatestDue, groupBySeries, toEventDate } from './reminderRules';
import { toIsoDate } from '@shared/isoDate';
import type { ReminderNotifier } from './reminderNotifier';
import type { ReminderSource } from './reminderSource';

export class ReminderScheduler {
  readonly #store: ReminderSource;
  readonly #notify: ReminderNotifier;
  #timer: NodeJS.Timeout | null = null;

  constructor(store: ReminderSource, notify: ReminderNotifier) {
    this.#store = store;
    this.#notify = notify;
  }

  start(): void {
    if (this.#timer) return;
    this.#timer = setInterval(() => this.check(), REMINDER_CHECK_INTERVAL_MS);
    this.check();
  }

  stop(): void {
    if (!this.#timer) return;
    clearInterval(this.#timer);
    this.#timer = null;
  }

  check(): void {
    const now = new Date();
    for (const occurrences of groupBySeries(this.#store.getPendingReminders(toIsoDate(now))).values()) {
      const due = findLatestDue(occurrences, now);
      if (!due) continue;
      this.#notify(due, toEventDate(due));
      this.#store.markNotified(due.id, due.date);
    }
  }
}
