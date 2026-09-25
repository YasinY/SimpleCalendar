import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { DiscardPrompt } from '@renderer/dialogs/DiscardPrompt';
import { ESCAPE_KEY, HIDDEN_ATTRIBUTE } from '@renderer/constants';
import { mountIndexDocument, requireById } from '@tests/support/indexDocument';

const OVERLAY_ID = 'discardOverlay';
const KEEP_SELECTOR = '[data-discard-keep]';
const CONFIRM_SELECTOR = '[data-discard-confirm]';
const KEYDOWN_EVENT = 'keydown';
const OTHER_KEY = 'Enter';

interface PromptFixture {
  prompt: DiscardPrompt;
  overlay: HTMLElement;
  keepButton: HTMLButtonElement;
  confirmButton: HTMLButtonElement;
}

function createFixture(): PromptFixture {
  const overlay = requireById(OVERLAY_ID);
  return {
    prompt: new DiscardPrompt(overlay),
    overlay,
    keepButton: overlay.querySelector(KEEP_SELECTOR) as HTMLButtonElement,
    confirmButton: overlay.querySelector(CONFIRM_SELECTOR) as HTMLButtonElement
  };
}

function pressKey(key: string): void {
  document.body.dispatchEvent(new KeyboardEvent(KEYDOWN_EVENT, { key, bubbles: true }));
}

function listenOnDocument(): Mock<(domEvent: Event) => void> {
  const listener = vi.fn<(domEvent: Event) => void>();
  document.addEventListener(KEYDOWN_EVENT, listener);
  return listener;
}

describe('DiscardPrompt', () => {
  beforeEach(() => {
    mountIndexDocument();
  });

  it('shows the prompt, focuses the keep button and resolves false when kept', async () => {
    const { prompt, overlay, keepButton } = createFixture();

    const pending = prompt.confirm();

    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(false);
    expect(document.activeElement).toBe(keepButton);
    keepButton.click();
    await expect(pending).resolves.toBe(false);
    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
  });

  it('resolves true when the discard is confirmed', async () => {
    const { prompt, overlay, confirmButton } = createFixture();

    const pending = prompt.confirm();
    confirmButton.click();

    await expect(pending).resolves.toBe(true);
    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
  });

  it('resolves false on escape and keeps the escape from reaching the document', async () => {
    const { prompt } = createFixture();
    const documentListener = listenOnDocument();

    const pending = prompt.confirm();
    pressKey(OTHER_KEY);
    pressKey(ESCAPE_KEY);

    await expect(pending).resolves.toBe(false);
    expect(documentListener).toHaveBeenCalledOnce();
    document.removeEventListener(KEYDOWN_EVENT, documentListener);
  });

  it('ignores escape and button clicks while no confirmation is pending', () => {
    const { overlay, confirmButton } = createFixture();
    const documentListener = listenOnDocument();

    pressKey(ESCAPE_KEY);
    confirmButton.click();

    expect(documentListener).toHaveBeenCalledOnce();
    expect(overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
    document.removeEventListener(KEYDOWN_EVENT, documentListener);
  });
});
