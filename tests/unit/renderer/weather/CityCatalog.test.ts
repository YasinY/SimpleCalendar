import { describe, expect, it, vi } from 'vitest';
import { CityCatalog } from '@renderer/weather/CityCatalog';
import type { CityRow } from '@renderer/weather/cityRow';

const ROWS: CityRow[] = [['Hamburg', 'Hamburg', 'DE', 53.55, 9.99, 1800000]];

vi.mock('@renderer/weather/cities', () => ({ default: ROWS }));

describe('CityCatalog', () => {
  it('loads the bundled rows into a search index once', async () => {
    const catalog = new CityCatalog();

    const first = catalog.load();
    const second = catalog.load();

    expect(second).toBe(first);
    expect(await first).toEqual([{ city: { name: 'Hamburg', region: 'Hamburg', country: 'DE', latitude: 53.55, longitude: 9.99 }, searchKeys: ['hamburg', 'hamburg'] }]);
  });
});
