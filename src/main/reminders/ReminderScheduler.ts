import { REMINDER_CHECK_INTERVAL_MS } from '../constants';
import { isDue, toEventDate } from './reminderRules';
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
    for (const event of this.#store.getPendingReminders()) {
      if (!isDue(event, now)) continue;
      this.#notify(event, toEventDate(event));
      this.#store.markNotified(event.id);
    }
  }
}
