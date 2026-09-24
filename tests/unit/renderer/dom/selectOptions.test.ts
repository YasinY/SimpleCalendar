import { describe, expect, it } from 'vitest';
import { fillSelect } from '../../../../src/renderer/dom/selectOptions';
import type { SelectOption } from '../../../../src/renderer/selectOption';

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
