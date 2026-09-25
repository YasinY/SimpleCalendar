import { ESCAPE_KEY, HIDDEN_ATTRIBUTE } from '@renderer/constants';
import { requireElement } from '@renderer/dom/elements';
import type { ChoicePromptOptions } from './choicePromptOptions';

export class ChoicePrompt<T> {
  readonly #element: HTMLElement;
  readonly #focusTarget: HTMLElement;
  readonly #cancelValue: T;
  #resolve: ((value: T) => void) | null = null;

  constructor(element: HTMLElement, { choices, cancelValue, focusSelector }: ChoicePromptOptions<T>) {
    this.#element = element;
    this.#cancelValue = cancelValue;
    this.#focusTarget = requireElement(element, focusSelector);
    this.#bindChoices(choices);
    this.#bindEscape();
  }

  ask(): Promise<T> {
    this.#element.removeAttribute(HIDDEN_ATTRIBUTE);
    this.#focusTarget.focus();
    return new Promise((resolve) => {
      this.#resolve = resolve;
    });
  }

  #settle(value: T): void {
    this.#element.setAttribute(HIDDEN_ATTRIBUTE, '');
    const resolve = this.#resolve;
    this.#resolve = null;
    resolve?.(value);
  }

  #bindChoices(choices: Record<string, T>): void {
    for (const [selector, value] of Object.entries(choices)) {
      requireElement<HTMLButtonElement>(this.#element, selector).addEventListener('click', () => this.#settle(value));
    }
  }

  #bindEscape(): void {
    window.addEventListener('keydown', (domEvent) => {
      if (domEvent.key !== ESCAPE_KEY || !this.#resolve) return;
      domEvent.stopPropagation();
      this.#settle(this.#cancelValue);
    }, { capture: true });
  }
}
