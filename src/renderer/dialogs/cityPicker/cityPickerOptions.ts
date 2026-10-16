import type { CityIndex } from '@renderer/weather/indexedCity';

export interface CityPickerOptions {
  loadCities: () => Promise<CityIndex>;
}
