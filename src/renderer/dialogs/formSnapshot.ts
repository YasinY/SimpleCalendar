const STATE_SEPARATOR = '\u0000';
const CHECKABLE_TYPES = new Set(['checkbox', 'radio']);

function controlState(control: Element): string {
  if (control instanceof HTMLInputElement && CHECKABLE_TYPES.has(control.type)) return String(control.checked);
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) return control.value;
  return '';
}

export function captureFormState(form: HTMLFormElement): string {
  return Array.from(form.elements, controlState).join(STATE_SEPARATOR);
}
