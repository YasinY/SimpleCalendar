import {
  CITY_OPTION_HEIGHT_PROPERTY,
  CITY_OPTION_HEIGHT_PX,
  CITY_OPTION_ID_PREFIX,
  CITY_OPTION_ROLE,
  CITY_PICKER_ARIA,
  CITY_PICKER_CLASSES,
  CITY_PICKER_KEYS,
  CITY_PICKER_SELECTORS,
  CITY_SEARCH_WARNING,
  FIRST_OPTION,
  NO_ACTIVE_OPTION,
  OPTION_STEP,
  OVERSCAN_CITY_OPTIONS,
  PIXEL_UNIT,
  SCROLL_TOP,
  VISIBLE_CITY_OPTIONS
} from './cityPickerConstants';
import { ESCAPE_KEY } from '@renderer/constants';
import { createElement, requireElement } from '@renderer/dom/elements';
import { NO_CITY_TEXT } from '@renderer/weather/cityConstants';
import { formatCityDetails, searchCities, toWeatherLocation } from '@renderer/weather/citySearch';
import type { CityPickerOptions } from './cityPickerOptions';
import type { City } from '@renderer/weather/city';
import type { WeatherLocation } from '@shared/weatherLocation';

const NO_MATCHES: City[] = [];
const WINDOW_SIZE = VISIBLE_CITY_OPTIONS + OVERSCAN_CITY_OPTIONS * 2;

function toPixels(rows: number): string {
  return rows * CITY_OPTION_HEIGHT_PX + PIXEL_UNIT;
}

export class CityPicker {
  readonly #input: HTMLInputElement;
  readonly #trigger: HTMLButtonElement;
  readonly #popover: HTMLElement;
  readonly #loadCities: CityPickerOptions['loadCities'];
  #matches: City[] = NO_MATCHES;
  #activeIndex = NO_ACTIVE_OPTION;
  #selected: WeatherLocation | null = null;
  #open = false;

  constructor(field: HTMLElement, { loadCities }: CityPickerOptions) {
    this.#input = requireElement(field, CITY_PICKER_SELECTORS.INPUT);
    this.#trigger = requireElement(field, CITY_PICKER_SELECTORS.TRIGGER);
    this.#popover = requireElement(field, CITY_PICKER_SELECTORS.POPOVER);
    this.#popover.style.setProperty(CITY_OPTION_HEIGHT_PROPERTY, toPixels(OPTION_STEP));
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
    this.#input.addEventListener('input', () => void this.#search(false));
    this.#input.addEventListener('click', () => void this.#search(true));
    this.#input.addEventListener('keydown', (domEvent) => this.#handleKey(domEvent));
    this.#input.addEventListener('blur', () => this.#setOpen(false));
    this.#trigger.addEventListener('pointerdown', (domEvent) => domEvent.preventDefault());
    this.#trigger.addEventListener('click', () => this.#toggle());
    this.#popover.addEventListener('pointerdown', (domEvent) => domEvent.preventDefault());
    this.#popover.addEventListener('scroll', () => this.#renderWindow());
  }

  #toggle(): void {
    this.#input.focus();
    if (this.#open) {
      this.#setOpen(false);
      return;
    }
    void this.#search(true);
  }

  async #search(listAllWhenEmpty: boolean): Promise<void> {
    const query = this.#input.value.trim();
    if (query === NO_CITY_TEXT && !listAllWhenEmpty) {
      this.#show(NO_MATCHES);
      return;
    }
    try {
      const index = await this.#loadCities();
      if (this.#input.value.trim() !== query) return;
      this.#show(searchCities(index, query));
    } catch (error) {
      console.warn(CITY_SEARCH_WARNING, error);
    }
  }

  #show(matches: City[]): void {
    this.#matches = matches;
    this.#activeIndex = matches.length > 0 ? FIRST_OPTION : NO_ACTIVE_OPTION;
    this.#popover.scrollTop = SCROLL_TOP;
    this.#renderWindow();
    this.#setOpen(matches.length > 0);
  }

  #renderWindow(): void {
    const total = this.#matches.length;
    const start = Math.max(FIRST_OPTION, Math.floor(this.#popover.scrollTop / CITY_OPTION_HEIGHT_PX) - OVERSCAN_CITY_OPTIONS);
    const end = Math.min(total, start + WINDOW_SIZE);
    const options = this.#matches.slice(start, end).map((city, offset) => this.#buildOption(city, start + offset));
    this.#popover.replaceChildren(this.#buildSpacer(start), ...options, this.#buildSpacer(total - end));
    this.#applyActiveState();
  }

  #buildSpacer(rows: number): HTMLElement {
    const spacer = createElement('div', CITY_PICKER_CLASSES.SPACER);
    spacer.style.height = toPixels(rows);
    return spacer;
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
    const activeId = CITY_OPTION_ID_PREFIX + this.#activeIndex;
    let activeRendered = false;
    for (const option of this.#popover.querySelectorAll<HTMLElement>('.' + CITY_PICKER_CLASSES.OPTION)) {
      const isActive = option.id === activeId;
      option.classList.toggle(CITY_PICKER_CLASSES.OPTION_ACTIVE, isActive);
      option.setAttribute(CITY_PICKER_ARIA.SELECTED, String(isActive));
      activeRendered ||= isActive;
    }
    if (activeRendered) this.#input.setAttribute(CITY_PICKER_ARIA.ACTIVE_DESCENDANT, activeId);
    else this.#input.removeAttribute(CITY_PICKER_ARIA.ACTIVE_DESCENDANT);
  }

  #handleKey(domEvent: KeyboardEvent): void {
    const key = domEvent.key;
    if (!this.#open) {
      if (key === CITY_PICKER_KEYS.NEXT) void this.#search(true);
      return;
    }
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
    this.#scrollActiveIntoView();
    this.#renderWindow();
  }

  #scrollActiveIntoView(): void {
    const popover = this.#popover;
    const top = this.#activeIndex * CITY_OPTION_HEIGHT_PX;
    const bottom = top + CITY_OPTION_HEIGHT_PX;
    if (top < popover.scrollTop) popover.scrollTop = top;
    else if (bottom > popover.scrollTop + popover.clientHeight) popover.scrollTop = bottom - popover.clientHeight;
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
