import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { ChoicePrompt } from '@renderer/dialogs/ChoicePrompt';
import { ESCAPE_KEY, HIDDEN_ATTRIBUTE } from '@renderer/constants';

const FIRST_ATTRIBUTE = 'data-first';
const SECOND_ATTRIBUTE = 'data-second';
const FIRST_SELECTOR = `[${FIRST_ATTRIBUTE}]`;
const SECOND_SELECTOR = `[${SECOND_ATTRIBUTE}]`;
const MISSING_SELECTOR = '[data-missing]';
const FIRST_VALUE = 'first';
const SECOND_VALUE = 'second';
const CANCEL_VALUE = 'cancel';
const KEYDOWN_EVENT = 'keydown';
const OTHER_KEY = 'Enter';
const EMPTY_ATTRIBUTE_VALUE = '';
const DEFAULT_CHOICES = { [FIRST_SELECTOR]: FIRST_VALUE, [SECOND_SELECTOR]: SECOND_VALUE };

interface PromptFixture {
  prompt: ChoicePrompt<string>;
  element: HTMLElement;
  firstButton: HTMLButtonElement;
  secondButton: HTMLButtonElement;
}

function createButton(attribute: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.setAttribute(attribute, EMPTY_ATTRIBUTE_VALUE);
  return button;
}

function createPromptElement(): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute(HIDDEN_ATTRIBUTE, EMPTY_ATTRIBUTE_VALUE);
  element.append(createButton(FIRST_ATTRIBUTE), createButton(SECOND_ATTRIBUTE));
  document.body.replaceChildren(element);
  return element;
}

function createPrompt(element: HTMLElement, focusSelector = FIRST_SELECTOR, choices: Record<string, string> = DEFAULT_CHOICES): ChoicePrompt<string> {
  return new ChoicePrompt(element, { choices, cancelValue: CANCEL_VALUE, focusSelector });
}

function createFixture(): PromptFixture {
  const element = createPromptElement();
  return {
    prompt: createPrompt(element),
    element,
    firstButton: element.querySelector(FIRST_SELECTOR) as HTMLButtonElement,
    secondButton: element.querySelector(SECOND_SELECTOR) as HTMLButtonElement
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

describe('ChoicePrompt', () => {
  let fixture: PromptFixture;

  beforeEach(() => {
    fixture = createFixture();
  });

  it('shows the prompt, focuses the focus target and resolves the clicked choice', async () => {
    const { prompt, element, firstButton, secondButton } = fixture;

    const pending = prompt.ask();

    expect(element.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(false);
    expect(document.activeElement).toBe(firstButton);
    secondButton.click();
    await expect(pending).resolves.toBe(SECOND_VALUE);
    expect(element.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
  });

  it('resolves the value of the focused choice when it is clicked', async () => {
    const { prompt, firstButton } = fixture;

    const pending = prompt.ask();
    firstButton.click();

    await expect(pending).resolves.toBe(FIRST_VALUE);
  });

  it('resolves the cancel value on escape and keeps the escape from reaching the document', async () => {
    const { prompt, element } = fixture;
    const documentListener = listenOnDocument();

    const pending = prompt.ask();
    pressKey(OTHER_KEY);
    pressKey(ESCAPE_KEY);

    await expect(pending).resolves.toBe(CANCEL_VALUE);
    expect(documentListener).toHaveBeenCalledOnce();
    expect(element.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
    document.removeEventListener(KEYDOWN_EVENT, documentListener);
  });

  it('ignores escape and button clicks while nothing is pending', () => {
    const { element, secondButton } = fixture;
    const documentListener = listenOnDocument();

    pressKey(ESCAPE_KEY);
    secondButton.click();

    expect(documentListener).toHaveBeenCalledOnce();
    expect(element.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
    document.removeEventListener(KEYDOWN_EVENT, documentListener);
  });

  it('throws when the focus target is missing', () => {
    expect(() => createPrompt(fixture.element, MISSING_SELECTOR)).toThrow(new Error(MISSING_SELECTOR));
  });

  it('throws when a choice button is missing', () => {
    expect(() => createPrompt(fixture.element, FIRST_SELECTOR, { [MISSING_SELECTOR]: FIRST_VALUE })).toThrow(new Error(MISSING_SELECTOR));
  });
});
