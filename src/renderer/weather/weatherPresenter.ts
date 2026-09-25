import type { WeatherLocation } from '@shared/weatherLocation';

export interface WeatherPresenter {
  start(): void;
  configure(city: string, cachedLocation: WeatherLocation | null): Promise<void>;
}
