import { describe, expect, it } from 'vitest';
import { isSameWeatherLocation } from '@renderer/weather/weatherLocationEquality';
import type { WeatherLocation } from '@shared/weatherLocation';

const HAMBURG: WeatherLocation = { city: 'Hamburg', name: 'Hamburg', latitude: 53.55, longitude: 9.99 };
const OTHER_NAME: WeatherLocation = { ...HAMBURG, name: 'Harburg' };
const OTHER_LATITUDE: WeatherLocation = { ...HAMBURG, latitude: 53.46 };
const OTHER_LONGITUDE: WeatherLocation = { ...HAMBURG, longitude: 10.1 };

describe('isSameWeatherLocation', () => {
  it('treats two missing locations as equal and a single missing one as different', () => {
    expect(isSameWeatherLocation(null, null)).toBe(true);
    expect(isSameWeatherLocation(HAMBURG, null)).toBe(false);
    expect(isSameWeatherLocation(null, HAMBURG)).toBe(false);
  });

  it('compares name and coordinates', () => {
    expect(isSameWeatherLocation(HAMBURG, { ...HAMBURG })).toBe(true);
    expect(isSameWeatherLocation(HAMBURG, OTHER_NAME)).toBe(false);
    expect(isSameWeatherLocation(HAMBURG, OTHER_LATITUDE)).toBe(false);
    expect(isSameWeatherLocation(HAMBURG, OTHER_LONGITUDE)).toBe(false);
  });
});
