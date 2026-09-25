import { beforeEach, describe, expect, it } from 'vitest';
import { SeriesScopePrompt } from '@renderer/dialogs/SeriesScopePrompt';
import { ESCAPE_KEY, HIDDEN_ATTRIBUTE, SERIES_SCOPES } from '@renderer/constants';
import { mountIndexDocument, requireById } from '@tests/support/indexDocument';

const OVERLAY_ID = 'scopeOverlay';
const OCCURRENCE_SELECTOR = '[data-scope-occurrence]';
const SERIES_SELECTOR = '[data-scope-series]';
const CANCEL_SELECTOR = '[data-scope-cancel]';
const KEYDOWN_EVENT = 'keydown';

interface PromptFixture {
  prompt: SeriesScopePrompt;
  overlay: HTMLElement;
}

function createFixture(): PromptFixture {
  const overlay = requireById(OVERLAY_ID);
  return { prompt: new SeriesScopePrompt(overlay), overlay };
}

function clickButton(overlay: HTMLElement, selector: string): void {
  (overlay.querySelector(selector) as HTMLButtonElement).click();
}

describe('SeriesScopePrompt', () => {
  let fixture: PromptFixture;

  beforeEach(() => {
    mountIndexDocument();
    fixture = createFixture();
  });

  it('shows the prompt, focuses the occurrence button and resolves the occurrence scope', async () => {
    const { prompt, overlay } = fixture;

    const pending = prompt.choose();

    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(false);
    expect(document.activeElement).toBe(overlay.querySelector(OCCURRENCE_SELECTOR));
    clickButton(overlay, OCCURRENCE_SELECTOR);
    await expect(pending).resolves.toBe(SERIES_SCOPES.OCCURRENCE);
    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
  });

  it('resolves the series scope', async () => {
    const { prompt, overlay } = fixture;

    const pending = prompt.choose();
    clickButton(overlay, SERIES_SELECTOR);

    await expect(pending).resolves.toBe(SERIES_SCOPES.SERIES);
  });

  it('resolves null when cancelled', async () => {
    const { prompt, overlay } = fixture;

    const pending = prompt.choose();
    clickButton(overlay, CANCEL_SELECTOR);

    await expect(pending).resolves.toBeNull();
  });

  it('resolves null on escape', async () => {
    const pending = fixture.prompt.choose();
    document.body.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT, { key: ESCAPE_KEY, bubbles: true }));

    await expect(pending).resolves.toBeNull();
  });
});
