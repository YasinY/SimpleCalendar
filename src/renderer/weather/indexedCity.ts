import type { City } from './city';

export interface IndexedCity {
  city: City;
  searchKeys: string[];
}

export type CityIndex = IndexedCity[];
