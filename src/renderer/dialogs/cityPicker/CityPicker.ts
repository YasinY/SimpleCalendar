import {
  CITY_OPTION_ID_PREFIX,
  CITY_OPTION_ROLE,
  CITY_PICKER_ARIA,
  CITY_PICKER_CLASSES,
  CITY_PICKER_KEYS,
  CITY_PICKER_SELECTORS,
  CITY_SEARCH_WARNING,
  FIRST_OPTION,
  NO_ACTIVE_OPTION,
  OPTION_STEP
} from './cityPickerConstants';
import { ESCAPE_KEY } from '@renderer/constants';
import { createElement, requireElement } from '@renderer/dom/elements';
import { MAX_CITY_SUGGESTIONS, NO_CITY_TEXT } from '@renderer/weather/cityConstants';
import { formatCityDetails, searchCities, toWeatherLocation } from '@renderer/weather/citySearch';
import type { CityPickerOptions } from './cityPickerOptions';
import type { City } from '@renderer/weather/city';
import type { WeatherLocation } from '@shared/weatherLocation';

const NO_MATCHES: City[] = [];

export class CityPicker {
  readonly #input: HTMLInputElement;
  readonly #popover: HTMLElement;
  readonly #loadCities: CityPickerOptions['loadCities'];
  #matches: City[] = NO_MATCHES;
  #activeIndex = NO_ACTIVE_OPTION;
  #selected: WeatherLocation | null = null;
  #open = false;

  constructor(field: HTMLElement, { loadCities }: CityPickerOptions) {
    this.#input = requireElement(field, CITY_PICKER_SELECTORS.INPUT);
    this.#popover = requireElement(field, CITY_PICKER_SELECTORS.POPOVER);
    this.#loadCities = loadCities;
    this.#bindInteractions();
  }

  reset(city: string, location: WeatherLocation | null): void {
    this.#input.value = city;
    this.#selected = location;
    this.#show(NO_MATCHES);
  }

  get location(): WeatherLocation | null {
    const text = this.#input.value.trim();
    if (text === NO_CITY_TEXT) return null;
    if (this.#selected?.city === text) return this.#selected;
    const [bestMatch] = this.#matches;
    return bestMatch ? toWeatherLocation(bestMatch) : null;
  }

  #bindInteractions(): void {
    this.#input.addEventListener('input', () => void this.#search());
    this.#input.addEventListener('keydown', (domEvent) => this.#handleKey(domEvent));
    this.#input.addEventListener('blur', () => this.#setOpen(false));
    this.#popover.addEventListener('pointerdown', (domEvent) => domEvent.preventDefault());
  }

  async #search(): Promise<void> {
    const query = this.#input.value.trim();
    if (query === NO_CITY_TEXT) {
      this.#show(NO_MATCHES);
      return;
    }
    try {
      const index = await this.#loadCities();
      if (this.#input.value.trim() !== query) return;
      this.#show(searchCities(index, query, MAX_CITY_SUGGESTIONS));
    } catch (error) {
      console.warn(CITY_SEARCH_WARNING, error);
    }
  }

  #show(matches: City[]): void {
    this.#matches = matches;
    this.#activeIndex = matches.length > 0 ? FIRST_OPTION : NO_ACTIVE_OPTION;
    this.#popover.replaceChildren(...matches.map((city, index) => this.#buildOption(city, index)));
    this.#applyActiveState();
    this.#setOpen(matches.length > 0);
  }

  #buildOption(city: City, index: number): HTMLElement {
    const option = createElement('div', CITY_PICKER_CLASSES.OPTION);
    option.id = CITY_OPTION_ID_PREFIX + index;
    option.setAttribute(CITY_PICKER_ARIA.ROLE, CITY_OPTION_ROLE);
    option.append(createElement('span', CITY_PICKER_CLASSES.NAME, city.name), createElement('span', CITY_PICKER_CLASSES.DETAILS, formatCityDetails(city)));
    option.addEventListener('click', () => this.#select(city));
    return option;
  }

  #applyActiveState(): void {
    const options = this.#popover.children;
    for (let index = 0; index < options.length; index += OPTION_STEP) {
      const isActive = index === this.#activeIndex;
      options[index].classList.toggle(CITY_PICKER_CLASSES.OPTION_ACTIVE, isActive);
      options[index].setAttribute(CITY_PICKER_ARIA.SELECTED, String(isActive));
    }
    const activeOption = options[this.#activeIndex];
    if (activeOption) this.#input.setAttribute(CITY_PICKER_ARIA.ACTIVE_DESCENDANT, activeOption.id);
    else this.#input.removeAttribute(CITY_PICKER_ARIA.ACTIVE_DESCENDANT);
  }

  #handleKey(domEvent: KeyboardEvent): void {
    if (!this.#open) return;
    const key = domEvent.key;
    if (key === CITY_PICKER_KEYS.NEXT || key === CITY_PICKER_KEYS.PREVIOUS) {
      this.#moveActive(key === CITY_PICKER_KEYS.NEXT ? OPTION_STEP : -OPTION_STEP);
    } else if (key === CITY_PICKER_KEYS.CONFIRM) {
      this.#select(this.#matches[this.#activeIndex]);
    } else if (key === ESCAPE_KEY) {
      this.#setOpen(false);
      domEvent.stopPropagation();
    } else {
      return;
    }
    domEvent.preventDefault();
  }

  #moveActive(delta: number): void {
    const count = this.#matches.length;
    this.#activeIndex = (this.#activeIndex + delta + count) % count;
    this.#applyActiveState();
  }

  #select(city: City): void {
    this.#selected = toWeatherLocation(city);
    this.#input.value = city.name;
    this.#show(NO_MATCHES);
    this.#input.focus();
  }

  #setOpen(open: boolean): void {
    if (open === this.#open) return;
    this.#open = open;
    this.#input.setAttribute(CITY_PICKER_ARIA.EXPANDED, String(open));
    if (open) this.#popover.showPopover?.();
    else this.#popover.hidePopover?.();
  }
}
