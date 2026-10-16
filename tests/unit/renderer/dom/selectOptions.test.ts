import { describe, expect, it } from 'vitest';
import { fillGroupedSelect, fillSelect } from '@renderer/dom/selectOptions';
import type { SelectOption } from '@renderer/selectOption';
import type { SelectOptionGroup } from '@renderer/selectOptionGroup';

const STALE_OPTION_VALUE = 'stale';
const OPTIONS: SelectOption[] = [
  { value: 'a', label: 'Erste' },
  { value: 'b', label: 'Zweite' }
];

describe('fillSelect', () => {
  it('replaces existing options with the given values and labels', () => {
    const select = document.createElement('select');
    const staleOption = document.createElement('option');
    staleOption.value = STALE_OPTION_VALUE;
    select.append(staleOption);

    fillSelect(select, OPTIONS);

    const rendered = Array.from(select.options, ({ value, textContent }) => ({ value, label: textContent }));
    expect(rendered).toEqual(OPTIONS);
  });
});

describe('fillGroupedSelect', () => {
  it('renders one optgroup per group with its label and options', () => {
    const select = document.createElement('select');
    const groups: SelectOptionGroup[] = [
      { label: 'Gruppe A', options: [OPTIONS[0]] },
      { label: 'Gruppe B', options: [OPTIONS[1]] }
    ];

    fillGroupedSelect(select, groups);

    const rendered = Array.from(select.querySelectorAll('optgroup'), (group) => ({
      label: group.label,
      options: Array.from(group.querySelectorAll('option'), ({ value, textContent }) => ({ value, label: textContent }))
    }));
    expect(rendered).toEqual(groups);
  });
});
