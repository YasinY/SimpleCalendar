import { SERIES_SCOPES } from '@renderer/constants';
import { ChoicePrompt } from './ChoicePrompt';
import type { ScopeChooser } from './scopeChooser';
import type { SeriesScope } from '@shared/seriesScope';

const SELECTORS = {
  OCCURRENCE_BUTTON: '[data-scope-occurrence]',
  SERIES_BUTTON: '[data-scope-series]',
  CANCEL_BUTTON: '[data-scope-cancel]'
} as const;

const CANCELLED = null;

export class SeriesScopePrompt implements ScopeChooser {
  readonly #prompt: ChoicePrompt<SeriesScope | null>;

  constructor(element: HTMLElement) {
    this.#prompt = new ChoicePrompt<SeriesScope | null>(element, {
      choices: {
        [SELECTORS.OCCURRENCE_BUTTON]: SERIES_SCOPES.OCCURRENCE,
        [SELECTORS.SERIES_BUTTON]: SERIES_SCOPES.SERIES,
        [SELECTORS.CANCEL_BUTTON]: CANCELLED
      },
      cancelValue: CANCELLED,
      focusSelector: SELECTORS.OCCURRENCE_BUTTON
    });
  }

  choose(): Promise<SeriesScope | null> {
    return this.#prompt.ask();
  }
}
