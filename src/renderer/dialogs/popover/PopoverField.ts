import { NOT_FOCUSABLE_BY_TAB, POPOVER_EVENTS, POPOVER_OPEN_STATE } from './popoverConstants';
import { ESCAPE_KEY } from '@renderer/constants';
import { requireElement } from '@renderer/dom/elements';
import type { PopoverFieldSelectors } from './popoverFieldSelectors';

export abstract class PopoverField {
  protected readonly input: HTMLInputElement;
  protected readonly trigger: HTMLButtonElement;
  protected readonly popover: HTMLElement;

  protected constructor(field: HTMLElement, selectors: PopoverFieldSelectors) {
    this.input = requireElement(field, selectors.INPUT);
    this.trigger = requireElement(field, selectors.TRIGGER);
    this.popover = requireElement(field, selectors.POPOVER);
    this.popover.tabIndex = NOT_FOCUSABLE_BY_TAB;
    this.#bindInteractions();
  }

  protected abstract open(): void;

  protected commit(value: string): void {
    const input = this.input;
    input.value = value;
    input.dispatchEvent(new Event(POPOVER_EVENTS.INPUT, { bubbles: true }));
    input.dispatchEvent(new Event(POPOVER_EVENTS.CHANGE, { bubbles: true }));
  }

  protected close(): void {
    this.popover.hidePopover?.();
    this.trigger.focus();
  }

  #bindInteractions(): void {
    this.popover.addEventListener(POPOVER_EVENTS.TOGGLE, (domEvent) => {
      if ((domEvent as ToggleEvent).newState !== POPOVER_OPEN_STATE) return;
      this.open();
    });
    this.popover.addEventListener('keydown', (domEvent) => {
      if (domEvent.key !== ESCAPE_KEY) return;
      domEvent.stopPropagation();
      this.trigger.focus();
    });
  }
}
