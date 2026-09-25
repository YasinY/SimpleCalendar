import { beforeEach, describe, expect, it, vi, type Mock, type MockInstance } from 'vitest';
import { DialogOverlay } from '@renderer/dialogs/DialogOverlay';
import { DiscardPrompt } from '@renderer/dialogs/DiscardPrompt';
import { ESCAPE_KEY, HIDDEN_ATTRIBUTE } from '@renderer/constants';
import { mountIndexDocument, requireById } from '@tests/support/indexDocument';

const OVERLAY_ID = 'dialogOverlay';
const DISCARD_OVERLAY_ID = 'discardOverlay';
const CANCEL_SELECTOR = '[data-dialog-cancel]';
const TITLE_SELECTOR = '[data-dialog-title]';
const CHANGED_TITLE = 'Geändert';
const OTHER_KEY = 'Enter';

interface OverlayFixture {
  overlay: DialogOverlay;
  element: HTMLElement;
  titleInput: HTMLInputElement;
  onDismiss: Mock<() => void>;
  confirm: MockInstance<() => Promise<boolean>>;
}

function createFixture(discard = true): OverlayFixture {
  const element = requireById(OVERLAY_ID);
  const discardPrompt = new DiscardPrompt(requireById(DISCARD_OVERLAY_ID));
  const confirm = vi.spyOn(discardPrompt, 'confirm').mockResolvedValue(discard);
  const onDismiss = vi.fn<() => void>();
  const overlay = new DialogOverlay(element, { cancelSelector: CANCEL_SELECTOR, discardPrompt, onDismiss });
  const titleInput = element.querySelector(TITLE_SELECTOR) as HTMLInputElement;
  return { overlay, element, titleInput, onDismiss, confirm };
}

function doubleClick(target: Element): void {
  target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
}

function pressKey(key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('DialogOverlay', () => {
  beforeEach(() => {
    mountIndexDocument();
  });

  it('toggles visibility via show and hide', () => {
    const { overlay, element } = createFixture();
    expect(overlay.isOpen).toBe(false);

    overlay.show();
    expect(overlay.isOpen).toBe(true);
    expect(element.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(false);

    overlay.hide();
    expect(overlay.isOpen).toBe(false);
  });

  it('dismisses immediately via the cancel button even with changes', () => {
    const { overlay, element, titleInput, onDismiss, confirm } = createFixture();
    overlay.show();
    titleInput.value = CHANGED_TITLE;

    (element.querySelector(CANCEL_SELECTOR) as HTMLButtonElement).click();

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('dismisses on a backdrop double click without changes', () => {
    const { overlay, element, onDismiss, confirm } = createFixture();
    overlay.show();

    doubleClick(element);

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('ignores double clicks on children of the overlay', () => {
    const { overlay, titleInput, onDismiss } = createFixture();
    overlay.show();

    doubleClick(titleInput);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('dismisses on escape only while open', () => {
    const { overlay, onDismiss } = createFixture();

    pressKey(ESCAPE_KEY);
    expect(onDismiss).not.toHaveBeenCalled();

    overlay.show();
    pressKey(OTHER_KEY);
    expect(onDismiss).not.toHaveBeenCalled();

    pressKey(ESCAPE_KEY);
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('dismisses changed forms once the discard is confirmed', async () => {
    const { overlay, element, titleInput, onDismiss, confirm } = createFixture(true);
    overlay.show();
    titleInput.value = CHANGED_TITLE;

    doubleClick(element);
    await flushPromises();

    expect(confirm).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('keeps changed forms open when the discard is declined', async () => {
    const { overlay, titleInput, onDismiss, confirm } = createFixture(false);
    overlay.show();
    titleInput.value = CHANGED_TITLE;

    pressKey(ESCAPE_KEY);
    await flushPromises();

    expect(confirm).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
