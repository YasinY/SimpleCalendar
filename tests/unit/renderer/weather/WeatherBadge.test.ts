import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCurrentWeather, resolveCondition } from '@renderer/weather/weatherApi';
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
  resolveCondition: vi.fn()
}));

const CITY = 'München';
const LATITUDE = 48.137;
const LONGITUDE = 11.575;
const TEMPERATURE = 17.6;
const ROUNDED_TEMPERATURE = 18;
const WEATHER_CODE = 61;
const FOCUS_EVENT = 'focus';
const FAILURE = new Error('offline');
const CONDITION = WEATHER_CONDITIONS[0];
const LOCATION: WeatherLocation = { city: CITY, name: CITY, latitude: LATITUDE, longitude: LONGITUDE };
const CURRENT = { temperature: TEMPERATURE, code: WEATHER_CODE };

const BADGE_MARKUP = '<span data-weather-icon></span><span data-weather-temp></span><span data-weather-label></span>';

const fetchWeatherMock = vi.mocked(fetchCurrentWeather);
const resolveConditionMock = vi.mocked(resolveCondition);

function normalizeMarkup(markup: string): string {
  const container = document.createElement('div');
  container.innerHTML = markup;
  return container.innerHTML;
}

describe('WeatherBadge', () => {
  let element: HTMLElement;
  let badge: WeatherBadge;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    element = document.createElement('div');
    element.innerHTML = BADGE_MARKUP;
    element.hidden = false;
    badge = new WeatherBadge(element);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
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
    await badge.configure(LOCATION);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1);
    expect(addListenerSpy).toHaveBeenCalledWith(FOCUS_EVENT, expect.any(Function));

    vi.setSystemTime(Date.now() + WEATHER_STALE_AFTER_MS);
    window.dispatchEvent(new Event(FOCUS_EVENT));
    await vi.waitFor(() => expect(fetchWeatherMock).toHaveBeenCalledTimes(2));

    await vi.advanceTimersByTimeAsync(WEATHER_REFRESH_INTERVAL_MS);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(3);
  });

  it('hides itself and stops without a location', async () => {
    await badge.configure(LOCATION);
    await badge.configure(null);
    expect(element.hidden).toBe(true);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1);
  });

  it('fetches the weather for the configured location', async () => {
    await badge.configure(LOCATION);
    expect(fetchWeatherMock).toHaveBeenCalledWith(LOCATION);
  });

  it('does not refresh without a location', async () => {
    badge.start();
    window.dispatchEvent(new Event(FOCUS_EVENT));
    await vi.advanceTimersByTimeAsync(WEATHER_REFRESH_INTERVAL_MS);
    expect(fetchWeatherMock).not.toHaveBeenCalled();
  });

  it('skips refreshing while the last fetch is still fresh', async () => {
    badge.start();
    await badge.configure(LOCATION);
    window.dispatchEvent(new Event(FOCUS_EVENT));
    await vi.advanceTimersByTimeAsync(WEATHER_STALE_AFTER_MS - 1);
    expect(fetchWeatherMock).toHaveBeenCalledTimes(1);
  });

  it('warns and stays hidden when fetching the weather fails', async () => {
    fetchWeatherMock.mockRejectedValue(FAILURE);
    await badge.configure(LOCATION);
    expect(warnSpy).toHaveBeenCalledWith(expect.any(String), FAILURE);
    expect(element.hidden).toBe(true);
  });

  it('renders icon, rounded temperature, label and tooltip', async () => {
    await badge.configure(LOCATION);
    const label = CONDITION.label + WEATHER_TOOLTIP_SEPARATOR + CITY;

    expect(resolveConditionMock).toHaveBeenCalledWith(WEATHER_CODE);
    expect(requirePart('[data-weather-icon]').innerHTML).toBe(normalizeMarkup(WEATHER_ICONS[CONDITION.icon]));
    expect(requirePart('[data-weather-temp]').textContent).toBe(ROUNDED_TEMPERATURE + TEMPERATURE_SUFFIX);
    expect(requirePart('[data-weather-label]').textContent).toBe(label);
    expect(element.title).toBe(label);
    expect(element.hidden).toBe(false);
  });
});
