import { requireElement } from '@renderer/dom/elements';
import { fetchCurrentWeather, resolveCondition } from './weatherApi';
import {
  TEMPERATURE_SUFFIX,
  WEATHER_ICONS,
  WEATHER_REFRESH_INTERVAL_MS,
  WEATHER_STALE_AFTER_MS,
  WEATHER_TOOLTIP_SEPARATOR
} from './weatherConstants';
import type { CurrentWeather } from './currentWeather';
import type { WeatherPresenter } from './weatherPresenter';
import type { WeatherLocation } from '@shared/weatherLocation';

const SELECTORS = {
  ICON: '[data-weather-icon]',
  TEMPERATURE: '[data-weather-temp]',
  LABEL: '[data-weather-label]'
} as const;

const FOCUS_EVENT = 'focus';
const NEVER_FETCHED = 0;

export class WeatherBadge implements WeatherPresenter {
  readonly #element: HTMLElement;
  readonly #iconElement: HTMLElement;
  readonly #temperatureElement: HTMLElement;
  readonly #labelElement: HTMLElement;
  #location: WeatherLocation | null = null;
  #lastFetchedAt = NEVER_FETCHED;

  constructor(element: HTMLElement) {
    this.#element = element;
    this.#iconElement = requireElement(element, SELECTORS.ICON);
    this.#temperatureElement = requireElement(element, SELECTORS.TEMPERATURE);
    this.#labelElement = requireElement(element, SELECTORS.LABEL);
  }

  start(): void {
    window.addEventListener(FOCUS_EVENT, () => void this.#refresh());
    setInterval(() => void this.#refresh(), WEATHER_REFRESH_INTERVAL_MS);
  }

  async configure(location: WeatherLocation | null): Promise<void> {
    this.#location = location;
    this.#lastFetchedAt = NEVER_FETCHED;
    this.#element.hidden = true;
    await this.#refresh();
  }

  async #refresh(): Promise<void> {
    if (!this.#location) return;
    if (Date.now() - this.#lastFetchedAt < WEATHER_STALE_AFTER_MS) return;
    try {
      const current = await fetchCurrentWeather(this.#location);
      this.#lastFetchedAt = Date.now();
      this.#render(current, this.#location);
    } catch (error) {
      console.warn('weather fetch failed', error);
    }
  }

  #render({ temperature, code }: CurrentWeather, location: WeatherLocation): void {
    const condition = resolveCondition(code);
    this.#iconElement.innerHTML = WEATHER_ICONS[condition.icon];
    this.#temperatureElement.textContent = Math.round(temperature) + TEMPERATURE_SUFFIX;
    const label = condition.label + WEATHER_TOOLTIP_SEPARATOR + location.name;
    this.#labelElement.textContent = label;
    this.#element.title = label;
    this.#element.hidden = false;
  }
}
