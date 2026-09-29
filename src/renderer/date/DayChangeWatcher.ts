import { CURRENT_TIME_TICK_MS } from '@renderer/constants';
import { startOfDay } from './dateUtils';
import type { DayChangeHandlers } from './dayChangeHandlers';
import type { DayChangeNotifier } from './dayChangeNotifier';

const FOCUS_EVENT = 'focus';
const VISIBILITY_EVENT = 'visibilitychange';

export class DayChangeWatcher implements DayChangeNotifier {
  readonly #handlers: DayChangeHandlers;
  #currentDay: Date = startOfDay(new Date());

  constructor(handlers: DayChangeHandlers) {
    this.#handlers = handlers;
  }

  start(): void {
    this.#currentDay = startOfDay(new Date());
    const check = (): void => this.#check();
    window.addEventListener(FOCUS_EVENT, check);
    document.addEventListener(VISIBILITY_EVENT, check);
    setInterval(check, CURRENT_TIME_TICK_MS);
  }

  #check(): void {
    const today = startOfDay(new Date());
    const previousDay = this.#currentDay;
    if (today.getTime() === previousDay.getTime()) return;
    this.#currentDay = today;
    this.#handlers.onDayChange(previousDay, today);
  }
}
