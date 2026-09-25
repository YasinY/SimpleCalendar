import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCurrentWeather, geocodeCity, resolveCondition } from '@renderer/weather/weatherApi';
import { WeatherBadge } from '@renderer/weather/WeatherBadge';
import {
  TEMPERATURE_SUFFIX,
  WEATHER_CONDITIONS,
  WEATHER_ICONS,
  WEATHER_REFRESH_INTERVAL_MS,
  WEATHER_STALE_AFTER_MS,
  WEATHER_TOOLTIP_SEPARATOR
} from '@renderer/weather/weatherConstants';
import type { WeatherLocation } from '@shared/weatherLocation';

vi.mock('@renderer/weather/weatherApi', () => ({
  fetchCurrentWeather: vi.fn(),
  geocodeCity: vi.fn(),
  resolveCondition: vi.fn()
}));

const CITY = 'muenchen';
const OTHER_CITY = 'berlin';
const EMPTY_CITY = '';
const RESOLVED_NAME = 'München';
const LATITUDE = 48.137;
const LONGITUDE = 11.575;
const TEMPERATURE = 17.6;
const ROUNDED_TEMPERATURE = 18;
const WEATHER_CODE = 61;
const FOCUS_EVENT = 'focus';
const FAILURE = new Error('offline');
const CONDITION = WEATHER_CONDITIONS[0];
const LOCATION: WeatherLocation = { city: CITY, name: RESOLVED_NAME, latitude: LATITUDE, longitude: LONGITUDE };
const CURRENT = { temperature: TEMPERATURE, code: WEATHER_CODE };

const BADGE_MARKUP = '<span data-weather-icon></span><span data-weather-temp></span><span data-weather-label></span>';

const geocodeMock = vi.mocked(geocodeCity);
const fetchWeatherMock = vi.mocked(fetchCurrentWeather);
const resolveConditionMock = vi.mocked(resolveCondition);

function normalizeMarkup(markup: string): string {
  const container = document.createElement('div');
  container.innerHTML = markup;
  return container.innerHTML;
}

describe('WeatherBadge', () => {
  let element: HTMLElement;
  let onLocationResolved: ReturnType<typeof vi.fn<(location: WeatherLocation) => void>>;
  let badge: WeatherBadge;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    element = document.createElement('div');
    element.innerHTML = BADGE_MARKUP;
    element.hidden = false;
    onLocationResolved = vi.fn<(location: WeatherLocation) => void>();
    badge = new WeatherBadge(element, { onLocationResolved });
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    geocodeMock.mockResolvedValue(LOCATION);
    fetchWeatherMock.mockResolvedValue(CURRENT);
    resolveConditionMock.mockReturnValue(CONDITION);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  function requirePart(selector: string): HTMLElement {
    return element.querySelector(selector) as HTMLElement;
  }

  it('refreshes on window focus and on the refresh interval', async () => {
    const addListenerSpy = vi.spyOn(window, 'addEventListener');
    badge.start();
    await badge.configure(CITY, LOCATION);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1);
    expect(addListenerSpy).toHaveBeenCalledWith(FOCUS_EVENT, expect.any(Function));

    vi.setSystemTime(Date.now() + WEATHER_STALE_AFTER_MS);
    window.dispatchEvent(new Event(FOCUS_EVENT));
    await vi.waitFor(() => expect(fetchWeatherMock).toHaveBeenCalledTimes(2));

    await vi.advanceTimersByTimeAsync(WEATHER_REFRESH_INTERVAL_MS);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(3);
  });

  it('hides itself and stops for an empty city', async () => {
    await badge.configure(EMPTY_CITY, LOCATION);
    expect(element.hidden).toBe(true);
    expect(geocodeMock).not.toHaveBeenCalled();
    expect(fetchWeatherMock).not.toHaveBeenCalled();
  });

  it('uses the cached location of the same city without geocoding', async () => {
    await badge.configure(CITY, LOCATION);
    expect(geocodeMock).not.toHaveBeenCalled();
    expect(fetchWeatherMock).toHaveBeenCalledWith(LOCATION);
  });

  it('geocodes a new city and reports the resolved location', async () => {
    await badge.configure(OTHER_CITY, LOCATION);
    expect(geocodeMock).toHaveBeenCalledWith(OTHER_CITY);
    expect(onLocationResolved).toHaveBeenCalledWith(LOCATION);
    expect(fetchWeatherMock).toHaveBeenCalledWith(LOCATION);
  });

  it('geocodes when there is no cached location', async () => {
    await badge.configure(CITY, null);
    expect(geocodeMock).toHaveBeenCalledWith(CITY);
  });

  it('stays hidden when the city cannot be found', async () => {
    geocodeMock.mockResolvedValue(null);
    await badge.configure(CITY, null);
    expect(onLocationResolved).not.toHaveBeenCalled();
    expect(fetchWeatherMock).not.toHaveBeenCalled();
    expect(element.hidden).toBe(true);
  });

  it('warns and stays hidden when geocoding fails', async () => {
    geocodeMock.mockRejectedValue(FAILURE);
    await badge.configure(CITY, null);
    expect(warnSpy).toHaveBeenCalledWith(expect.any(String), FAILURE);
    expect(fetchWeatherMock).not.toHaveBeenCalled();
    expect(element.hidden).toBe(true);
  });

  it('does not refresh without a location', async () => {
    badge.start();
    window.dispatchEvent(new Event(FOCUS_EVENT));
    await vi.advanceTimersByTimeAsync(WEATHER_REFRESH_INTERVAL_MS);
    expect(fetchWeatherMock).not.toHaveBeenCalled();
  });

  it('skips refreshing while the last fetch is still fresh', async () => {
    badge.start();
    await badge.configure(CITY, LOCATION);
    window.dispatchEvent(new Event(FOCUS_EVENT));
    await vi.advanceTimersByTimeAsync(WEATHER_STALE_AFTER_MS - 1);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1);
  });

  it('warns and stays hidden when fetching the weather fails', async () => {
    fetchWeatherMock.mockRejectedValue(FAILURE);
    await badge.configure(CITY, LOCATION);
    expect(warnSpy).toHaveBeenCalledWith(expect.any(String), FAILURE);
    expect(element.hidden).toBe(true);
  });

  it('renders icon, rounded temperature, label and tooltip', async () => {
    await badge.configure(CITY, LOCATION);
    const label = CONDITION.label + WEATHER_TOOLTIP_SEPARATOR + RESOLVED_NAME;

    expect(resolveConditionMock).toHaveBeenCalledWith(WEATHER_CODE);
    expect(requirePart('[data-weather-icon]').innerHTML).toBe(normalizeMarkup(WEATHER_ICONS[CONDITION.icon]));
    expect(requirePart('[data-weather-temp]').textContent).toBe(ROUNDED_TEMPERATURE + TEMPERATURE_SUFFIX);
    expect(requirePart('[data-weather-label]').textContent).toBe(label);
    expect(element.title).toBe(label);
    expect(element.hidden).toBe(false);
  });
});
