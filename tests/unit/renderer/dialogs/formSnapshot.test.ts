import { describe, expect, it } from 'vitest';
import { captureFormState } from '../../../../src/renderer/dialogs/formSnapshot';

const STATE_SEPARATOR = '\u0000';
const NON_VALUE_STATE = '';
const TEXT_VALUE = 'Hallo';
const SELECT_VALUE = 'b';
const TEXTAREA_VALUE = 'Notizen';
const FORM_MARKUP = `
  <input type="checkbox" checked>
  <input type="radio">
  <input type="text" value="${TEXT_VALUE}">
  <select><option value="a">A</option><option value="${SELECT_VALUE}" selected>B</option></select>
  <textarea>${TEXTAREA_VALUE}</textarea>
  <fieldset></fieldset>
  <button type="button"></button>
`;

function createForm(): HTMLFormElement {
  const form = document.createElement('form');
  form.innerHTML = FORM_MARKUP;
  return form;
}

describe('captureFormState', () => {
  it('serializes checkables, values and non value controls in document order', () => {
    const expected = [
      String(true),
      String(false),
      TEXT_VALUE,
      SELECT_VALUE,
      TEXTAREA_VALUE,
      NON_VALUE_STATE,
      NON_VALUE_STATE
    ].join(STATE_SEPARATOR);

    expect(captureFormState(createForm())).toBe(expected);
  });

  it('changes when a control value changes', () => {
    const form = createForm();
    const before = captureFormState(form);
    const textInput = form.querySelector('input[type="text"]') as HTMLInputElement;

    textInput.value = TEXT_VALUE + TEXT_VALUE;

    expect(captureFormState(form)).not.toBe(before);
  });
});
