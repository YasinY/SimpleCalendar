import { sortLocalFirst, toIndexedCity } from './citySearch';
import type { CityIndex } from './indexedCity';

export class CityCatalog {
  #index: Promise<CityIndex> | null = null;

  load(): Promise<CityIndex> {
    if (this.#index) return this.#index;
    this.#index = import('./cities').then(({ default: rows }) => sortLocalFirst(rows.map(toIndexedCity)));
    return this.#index;
  }
}
