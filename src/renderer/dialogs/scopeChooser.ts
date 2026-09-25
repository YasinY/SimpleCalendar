import type { SeriesScope } from '@shared/seriesScope';

export interface ScopeChooser {
  choose(): Promise<SeriesScope | null>;
}
