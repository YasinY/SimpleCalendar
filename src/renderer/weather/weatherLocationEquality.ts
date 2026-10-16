import type { WeatherLocation } from '@shared/weatherLocation';

const KEY_SEPARATOR = '|';

function toLocationKey(location: WeatherLocation): string {
  return [location.name, location.latitude, location.longitude].join(KEY_SEPARATOR);
}

export function isSameWeatherLocation(first: WeatherLocation | null, second: WeatherLocation | null): boolean {
  if (first === null || second === null) return first === second;
  return toLocationKey(first) === toLocationKey(second);
}
