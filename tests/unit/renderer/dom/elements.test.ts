import { describe, expect, it } from 'vitest';
import {
  closestElement,
  createElement,
  createTitledElement,
  requireElement,
  requireElementById
} from '../../../../src/renderer/dom/elements';

const CLASS_NAME = 'box';
const TEXT = 'Hallo';
const ELEMENT_ID = 'target';

describe('elements', () => {
  it('creates an element with class and optional text', () => {
    const withText = createElement('div', CLASS_NAME, TEXT);
    expect(withText.className).toBe(CLASS_NAME);
    expect(withText.textContent).toBe(TEXT);
    expect(createElement('span', CLASS_NAME).textContent).toBe('');
  });

  it('mirrors the text into the title for titled elements', () => {
    expect(createTitledElement('div', CLASS_NAME, TEXT).title).toBe(TEXT);
  });

  it('finds the closest matching ancestor only for element targets', () => {
    const parent = createElement('div', CLASS_NAME);
    const child = createElement('span', '');
    parent.append(child);
    expect(closestElement(child, '.' + CLASS_NAME)).toBe(parent);
    expect(closestElement(null, '.' + CLASS_NAME)).toBeNull();
    expect(closestElement(document.createTextNode(TEXT), '.' + CLASS_NAME)).toBeNull();
  });

  it('requires elements by selector and by id', () => {
    const root = createElement('div', '');
    const child = createElement('p', CLASS_NAME);
    child.id = ELEMENT_ID;
    root.append(child);
    document.body.replaceChildren(root);

    expect(requireElement(root, '.' + CLASS_NAME)).toBe(child);
    expect(requireElementById(ELEMENT_ID)).toBe(child);
    expect(() => requireElement(root, '.missing')).toThrow('.missing');
    expect(() => requireElementById('missing')).toThrow('missing');
  });
});
