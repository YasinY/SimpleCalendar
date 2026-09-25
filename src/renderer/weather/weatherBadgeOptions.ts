import type { WeatherLocation } from '@shared/weatherLocation';

export interface WeatherBadgeOptions {
  onLocationResolved: (location: WeatherLocation) => void;
}
