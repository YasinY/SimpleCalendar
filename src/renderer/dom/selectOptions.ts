import type { SelectOption } from '../selectOption';

export function fillSelect(select: HTMLSelectElement, options: SelectOption[]): void {
  const fragment = document.createDocumentFragment();
  for (const { value, label } of options) {
    const element = document.createElement('option');
    element.value = value;
    element.textContent = label;
    fragment.append(element);
  }
  select.replaceChildren(fragment);
}
