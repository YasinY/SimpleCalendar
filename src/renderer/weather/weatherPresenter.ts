import type { WeatherLocation } from '@shared/weatherLocation';

export interface WeatherPresenter {
  start(): void;
  configure(location: WeatherLocation | null): Promise<void>;
}
