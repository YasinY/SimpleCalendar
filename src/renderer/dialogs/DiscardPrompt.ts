import { ESCAPE_KEY, HIDDEN_ATTRIBUTE } from '../constants';
import { requireElement } from '../dom/elements';

const SELECTORS = {
  KEEP_BUTTON: '[data-discard-keep]',
  CONFIRM_BUTTON: '[data-discard-confirm]'
} as const;

export class DiscardPrompt {
  readonly #element: HTMLElement;
  readonly #keepButton: HTMLButtonElement;
  #resolve: ((discard: boolean) => void) | null = null;

  constructor(element: HTMLElement) {
    this.#element = element;
    this.#keepButton = requireElement(element, SELECTORS.KEEP_BUTTON);
    this.#bindInteractions();
  }

  confirm(): Promise<boolean> {
    this.#element.removeAttribute(HIDDEN_ATTRIBUTE);
    this.#keepButton.focus();
    return new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  #settle(discard: boolean): void {
    this.#element.setAttribute(HIDDEN_ATTRIBUTE, '');
    const resolve = this.#resolve;
    this.#resolve = null;
    resolve?.(discard);
  }

  #bindInteractions(): void {
    this.#keepButton.addEventListener('click', () => this.#settle(false));
    requireElement<HTMLButtonElement>(this.#element, SELECTORS.CONFIRM_BUTTON).addEventListener('click', () => this.#settle(true));

    window.addEventListener('keydown', (domEvent) => {
      if (domEvent.key !== ESCAPE_KEY || !this.#resolve) return;
      domEvent.stopPropagation();
      this.#settle(false);
    }, { capture: true });
  }
}
