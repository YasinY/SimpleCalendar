import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CityPicker } from '@renderer/dialogs/cityPicker/CityPicker';
import { toIndexedCity, toWeatherLocation, toCity } from '@renderer/weather/citySearch';
import { mountIndexDocument } from '@tests/support/indexDocument';
import type { CityIndex } from '@renderer/weather/indexedCity';
import type { CityRow } from '@renderer/weather/cityRow';
import type { WeatherLocation } from '@shared/weatherLocation';

const ROWS = {
  HAMBURG: ['Hamburg', 'Hamburg', 'DE', 53.55, 9.99, 1800000] as CityRow,
  HAMBURG_US: ['Hamburg', 'New York', 'US', 42.72, -78.83, 10000] as CityRow,
  BERLIN: ['Berlin', 'Berlin', 'DE', 52.52, 13.41, 3400000] as CityRow
};
const INDEX: CityIndex = [ROWS.BERLIN, ROWS.HAMBURG, ROWS.HAMBURG_US].map(toIndexedCity);
const LARGE_INDEX_SIZE = 40;
const LARGE_INDEX: CityIndex = Array.from({ length: LARGE_INDEX_SIZE }, (_, index) => toIndexedCity(['Ort ' + index, '', 'DE', index, index, index]));
const HAMBURG = toWeatherLocation(toCity(ROWS.HAMBURG));
const HAMBURG_US = toWeatherLocation(toCity(ROWS.HAMBURG_US));
const STORED_LOCATION: WeatherLocation = { city: 'Hamburg', name: 'Hamburg', latitude: 1, longitude: 2 };
const QUERIES = { HAM: 'Ham', BER: 'Ber', EMPTY: '', UNKNOWN: 'Nirgendwo', PADDED_HAMBURG: ' Hamburg ' } as const;
const KEYS = { DOWN: 'ArrowDown', UP: 'ArrowUp', ENTER: 'Enter', ESCAPE: 'Escape', LETTER: 'a' } as const;
const ARIA = { EXPANDED: 'aria-expanded', ACTIVE_DESCENDANT: 'aria-activedescendant', SELECTED: 'aria-selected' } as const;
const FLAGS = { TRUE: 'true', FALSE: 'false' } as const;
const OPTION_IDS = { FIRST: 'cityOption-0', SECOND: 'cityOption-1', THIRD: 'cityOption-2', LAST: 'cityOption-39' } as const;
const DETAILS = { HAMBURG: 'Hamburg, Deutschland', HAMBURG_US: 'New York, Vereinigte Staaten' } as const;
const OPTION_HEIGHT = 36;
const WINDOW_SIZE = 16;
const VISIBLE_HEIGHT = 8 * OPTION_HEIGHT;
const SCROLLED_ROWS = 20;
const FAILURE = new Error('broken');

const SELECTORS = {
  FIELD: '[data-settings-city-field]',
  INPUT: 'input',
  TRIGGER: '[data-city-picker-trigger]',
  POPOVER: '[data-city-picker]',
  OPTION: '.city-picker__option',
  ACTIVE_OPTION: '.city-picker__option--active',
  SPACER: '.city-picker__spacer',
  NAME: '.city-picker__name',
  DETAILS: '.city-picker__details'
} as const;

interface Fixture {
  picker: CityPicker;
  input: HTMLInputElement;
  trigger: HTMLButtonElement;
  popover: HTMLElement;
  loadCities: ReturnType<typeof vi.fn<() => Promise<CityIndex>>>;
}

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(selector);
  return element;
}

function createFixture(loadCities = vi.fn<() => Promise<CityIndex>>(async () => INDEX)): Fixture {
  const field = query<HTMLElement>(document, SELECTORS.FIELD);
  return {
    picker: new CityPicker(field, { loadCities }),
    input: query(field, SELECTORS.INPUT),
    trigger: query(field, SELECTORS.TRIGGER),
    popover: query(field, SELECTORS.POPOVER),
    loadCities
  };
}

async function settle(fixture: Fixture): Promise<void> {
  await vi.waitFor(() => expect(fixture.loadCities).toHaveBeenCalled());
  await Promise.resolve();
  await Promise.resolve();
}

async function openAll(fixture: Fixture): Promise<void> {
  fixture.input.click();
  await settle(fixture);
}

async function type(fixture: Fixture, text: string): Promise<void> {
  fixture.input.value = text;
  fixture.input.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(fixture);
}

function press(fixture: Fixture, key: string): KeyboardEvent {
  const keyEvent = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  fixture.input.dispatchEvent(keyEvent);
  return keyEvent;
}

function optionNames(popover: HTMLElement): (string | null)[] {
  return Array.from(popover.querySelectorAll(SELECTORS.NAME), (name) => name.textContent);
}

function spacerHeights(popover: HTMLElement): string[] {
  return Array.from(popover.querySelectorAll<HTMLElement>(SELECTORS.SPACER), (spacer) => spacer.style.height);
}

describe('CityPicker', () => {
  beforeEach(() => {
    mountIndexDocument();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows suggestions with details while typing and activates the first one', async () => {
    const fixture = createFixture();

    await type(fixture, QUERIES.HAM);

    const { popover, input } = fixture;
    expect(optionNames(popover)).toEqual(['Hamburg', 'Hamburg']);
    expect(Array.from(popover.querySelectorAll(SELECTORS.DETAILS), (details) => details.textContent)).toEqual([DETAILS.HAMBURG, DETAILS.HAMBURG_US]);
    expect(query<HTMLElement>(popover, SELECTORS.ACTIVE_OPTION).id).toBe(OPTION_IDS.FIRST);
    expect(input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.TRUE);
    expect(input.getAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(OPTION_IDS.FIRST);
    expect(popover.querySelectorAll(SELECTORS.OPTION)[1].getAttribute(ARIA.SELECTED)).toBe(FLAGS.FALSE);
  });

  it('opens the full list on click into the empty input and toggles it with the trigger', async () => {
    const fixture = createFixture();
    const showPopover = vi.fn();
    const hidePopover = vi.fn();
    Object.assign(fixture.popover, { showPopover, hidePopover });

    fixture.input.click();
    await settle(fixture);
    expect(optionNames(fixture.popover)).toEqual(['Berlin', 'Hamburg', 'Hamburg']);
    expect(showPopover).toHaveBeenCalledTimes(1);

    fixture.trigger.click();
    expect(hidePopover).toHaveBeenCalledTimes(1);
    expect(fixture.input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.FALSE);
    expect(document.activeElement).toBe(fixture.input);

    fixture.trigger.click();
    await vi.waitFor(() => expect(showPopover).toHaveBeenCalledTimes(2));
  });

  it('closes the list when the text is cleared by typing without loading the catalog', () => {
    const fixture = createFixture();
    fixture.input.value = QUERIES.EMPTY;
    fixture.input.dispatchEvent(new Event('input'));

    expect(fixture.loadCities).not.toHaveBeenCalled();
    expect(fixture.popover.querySelectorAll(SELECTORS.OPTION)).toHaveLength(0);
    expect(fixture.input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.FALSE);
  });

  it('keeps the input focused when pressing the trigger or the suggestions', async () => {
    const fixture = createFixture();
    await type(fixture, QUERIES.HAM);

    const triggerPress = new Event('pointerdown', { cancelable: true });
    fixture.trigger.dispatchEvent(triggerPress);
    const popoverPress = new Event('pointerdown', { cancelable: true });
    fixture.popover.dispatchEvent(popoverPress);

    expect(triggerPress.defaultPrevented).toBe(true);
    expect(popoverPress.defaultPrevented).toBe(true);
  });

  it('renders only a window of a long list and moves it while scrolling', async () => {
    const fixture = createFixture(vi.fn(async () => LARGE_INDEX));
    await openAll(fixture);

    const { popover } = fixture;
    expect(popover.querySelectorAll(SELECTORS.OPTION)).toHaveLength(WINDOW_SIZE);
    expect(spacerHeights(popover)).toEqual(['0px', (LARGE_INDEX_SIZE - WINDOW_SIZE) * OPTION_HEIGHT + 'px']);

    popover.scrollTop = SCROLLED_ROWS * OPTION_HEIGHT;
    popover.dispatchEvent(new Event('scroll'));

    expect(query<HTMLElement>(popover, SELECTORS.OPTION).id).toBe('cityOption-' + (SCROLLED_ROWS - 4));
    expect(fixture.input.hasAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(false);
  });

  it('scrolls the active option into view when moving past the window', async () => {
    const fixture = createFixture(vi.fn(async () => LARGE_INDEX));
    await openAll(fixture);

    press(fixture, KEYS.UP);

    expect(fixture.input.getAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(OPTION_IDS.LAST);
    expect(fixture.popover.scrollTop).toBe(LARGE_INDEX_SIZE * OPTION_HEIGHT);

    press(fixture, KEYS.DOWN);
    expect(fixture.input.getAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(OPTION_IDS.FIRST);
    expect(fixture.popover.scrollTop).toBe(0);
  });

  it('drops results of a query that changed while the catalog was loading', async () => {
    let resolveIndex: (index: CityIndex) => void = () => undefined;
    const pendingIndex = new Promise<CityIndex>((resolve) => (resolveIndex = resolve));
    const fixture = createFixture(vi.fn(() => pendingIndex));
    fixture.input.value = QUERIES.HAM;
    fixture.input.dispatchEvent(new Event('input'));
    fixture.input.value = QUERIES.BER;
    fixture.input.dispatchEvent(new Event('input'));

    resolveIndex(INDEX);
    await vi.waitFor(() => expect(optionNames(fixture.popover)).toEqual(['Berlin']));
  });

  it('warns when the catalog cannot be loaded', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = createFixture(vi.fn(async () => Promise.reject(FAILURE)));

    await type(fixture, QUERIES.HAM);

    await vi.waitFor(() => expect(warnSpy).toHaveBeenCalledWith(expect.any(String), FAILURE));
    expect(fixture.popover.querySelectorAll(SELECTORS.OPTION)).toHaveLength(0);
  });

  it('selects an option by click, closes and keeps the focus on the input', async () => {
    const fixture = createFixture();
    await type(fixture, QUERIES.HAM);

    fixture.popover.querySelectorAll<HTMLElement>(SELECTORS.OPTION)[1].click();

    expect(fixture.input.value).toBe(HAMBURG_US.name);
    expect(fixture.picker.location).toEqual(HAMBURG_US);
    expect(fixture.input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.FALSE);
    expect(document.activeElement).toBe(fixture.input);
  });

  it('moves the active option with the arrow keys, wrapping around, and confirms with enter', async () => {
    const fixture = createFixture();
    Object.defineProperty(fixture.popover, 'clientHeight', { value: VISIBLE_HEIGHT, configurable: true });
    await type(fixture, QUERIES.HAM);

    expect(press(fixture, KEYS.DOWN).defaultPrevented).toBe(true);
    expect(fixture.input.getAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(OPTION_IDS.SECOND);
    press(fixture, KEYS.DOWN);
    expect(fixture.input.getAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(OPTION_IDS.FIRST);
    press(fixture, KEYS.UP);
    expect(fixture.input.getAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(OPTION_IDS.SECOND);

    expect(press(fixture, KEYS.ENTER).defaultPrevented).toBe(true);
    expect(fixture.picker.location).toEqual(HAMBURG_US);
    expect(fixture.input.hasAttribute(ARIA.ACTIVE_DESCENDANT)).toBe(false);
  });

  it('opens the list with arrow down while closed and ignores other keys while closed', async () => {
    const fixture = createFixture();

    expect(press(fixture, KEYS.LETTER).defaultPrevented).toBe(false);
    expect(fixture.loadCities).not.toHaveBeenCalled();

    expect(press(fixture, KEYS.DOWN).defaultPrevented).toBe(false);
    await settle(fixture);
    expect(fixture.input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.TRUE);
  });

  it('closes on escape without letting the key reach the document and ignores other keys while open', async () => {
    const fixture = createFixture();
    const documentKeydown = vi.fn();
    document.addEventListener('keydown', documentKeydown);
    await type(fixture, QUERIES.HAM);

    expect(press(fixture, KEYS.LETTER).defaultPrevented).toBe(false);
    expect(press(fixture, KEYS.ESCAPE).defaultPrevented).toBe(true);
    expect(fixture.input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.FALSE);
    expect(documentKeydown).toHaveBeenCalledTimes(1);
    document.removeEventListener('keydown', documentKeydown);
  });

  it('closes when the input loses focus', async () => {
    const fixture = createFixture();
    await type(fixture, QUERIES.HAM);

    fixture.input.dispatchEvent(new Event('blur'));

    expect(fixture.input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.FALSE);
  });

  it('falls back to the best match when no suggestion was chosen', async () => {
    const fixture = createFixture();
    await type(fixture, QUERIES.HAM);

    expect(fixture.picker.location).toEqual(HAMBURG);
  });

  it('reports no location for empty or unknown text', async () => {
    const fixture = createFixture();
    fixture.picker.reset(QUERIES.EMPTY, null);
    expect(fixture.picker.location).toBeNull();
    expect(fixture.loadCities).not.toHaveBeenCalled();

    await type(fixture, QUERIES.UNKNOWN);
    expect(fixture.picker.location).toBeNull();
    expect(fixture.input.getAttribute(ARIA.EXPANDED)).toBe(FLAGS.FALSE);
  });

  it('keeps a preset location while the text still names it', async () => {
    const fixture = createFixture();
    fixture.picker.reset(QUERIES.PADDED_HAMBURG, STORED_LOCATION);
    expect(fixture.input.value).toBe(QUERIES.PADDED_HAMBURG);
    expect(fixture.picker.location).toBe(STORED_LOCATION);

    await type(fixture, QUERIES.HAM);
    expect(fixture.picker.location).toEqual(HAMBURG);
  });
});
