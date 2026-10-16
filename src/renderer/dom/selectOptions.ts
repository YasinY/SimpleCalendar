import type { SelectOption } from '@renderer/selectOption';
import type { SelectOptionGroup } from '@renderer/selectOptionGroup';

function createOption({ value, label }: SelectOption): HTMLOptionElement {
  const element = document.createElement('option');
  element.value = value;
  element.textContent = label;
  return element;
}

function createGroup({ label, options }: SelectOptionGroup): HTMLOptGroupElement {
  const element = document.createElement('optgroup');
  element.label = label;
  element.append(...options.map(createOption));
  return element;
}

export function fillSelect(select: HTMLSelectElement, options: SelectOption[]): void {
  select.replaceChildren(...options.map(createOption));
}

export function fillGroupedSelect(select: HTMLSelectElement, groups: SelectOptionGroup[]): void {
  select.replaceChildren(...groups.map(createGroup));
}
