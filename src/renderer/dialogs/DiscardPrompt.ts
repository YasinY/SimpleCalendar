import { ChoicePrompt } from './ChoicePrompt';

const SELECTORS = {
  KEEP_BUTTON: '[data-discard-keep]',
  CONFIRM_BUTTON: '[data-discard-confirm]'
} as const;

const KEEP_EDITING = false;
const DISCARD = true;

export class DiscardPrompt {
  readonly #prompt: ChoicePrompt<boolean>;

  constructor(element: HTMLElement) {
    this.#prompt = new ChoicePrompt(element, {
      choices: { [SELECTORS.KEEP_BUTTON]: KEEP_EDITING, [SELECTORS.CONFIRM_BUTTON]: DISCARD },
      cancelValue: KEEP_EDITING,
      focusSelector: SELECTORS.KEEP_BUTTON
    });
  }

  confirm(): Promise<boolean> {
    return this.#prompt.ask();
  }
}
