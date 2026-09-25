import { ESCAPE_KEY, HIDDEN_ATTRIBUTE } from '@renderer/constants';
import { requireElement } from '@renderer/dom/elements';
import { captureFormState } from './formSnapshot';
import type { DialogOverlayOptions } from './dialogOverlayOptions';
import type { DiscardPrompt } from './DiscardPrompt';

const FORM_SELECTOR = 'form';

export class DialogOverlay {
  readonly #element: HTMLElement;
  readonly #form: HTMLFormElement;
  readonly #discardPrompt: DiscardPrompt;
  readonly #onDismiss: () => void;
  #initialFormState = '';

  constructor(element: HTMLElement, { cancelSelector, discardPrompt, onDismiss }: DialogOverlayOptions) {
    this.#element = element;
    this.#form = requireElement(element, FORM_SELECTOR);
    this.#discardPrompt = discardPrompt;
    this.#onDismiss = onDismiss;
    this.#bindDismissal(cancelSelector);
  }

  get isOpen(): boolean {
    return !this.#element.hasAttribute(HIDDEN_ATTRIBUTE);
  }

  show(): void {
    this.#element.removeAttribute(HIDDEN_ATTRIBUTE);
    this.#initialFormState = captureFormState(this.#form);
  }

  hide(): void {
    this.#element.setAttribute(HIDDEN_ATTRIBUTE, '');
  }

  #hasUnsavedChanges(): boolean {
    return captureFormState(this.#form) !== this.#initialFormState;
  }

  async #requestDismiss(): Promise<void> {
    if (this.#hasUnsavedChanges() && !(await this.#discardPrompt.confirm())) return;
    this.#onDismiss();
  }

  #bindDismissal(cancelSelector: string): void {
    requireElement<HTMLButtonElement>(this.#element, cancelSelector).addEventListener('click', () => this.#onDismiss());

    this.#element.addEventListener('dblclick', (domEvent) => {
      if (domEvent.target !== this.#element) return;
      void this.#requestDismiss();
    });

    document.addEventListener('keydown', (domEvent) => {
      if (domEvent.key !== ESCAPE_KEY || !this.isOpen) return;
      void this.#requestDismiss();
    });
  }
}
