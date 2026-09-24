import { describe, expect, it } from 'vitest';
import { buildColorSwatches } from '../../../../src/renderer/dialogs/colorSwatches';
import { CSS_CLASSES, SWATCH_CLASS_PREFIX } from '../../../../src/renderer/constants';
import { EVENT_COLORS } from '../../../../src/renderer/events/eventColors';

const COLOR_INPUT_NAME = 'eventColor';
const RADIO_TYPE = 'radio';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';

describe('buildColorSwatches', () => {
  it('replaces the group content with one labelled radio swatch per event color', () => {
    const group = document.createElement('div');
    group.append(document.createElement('p'));

    buildColorSwatches(group);

    const swatches = Array.from(group.children);
    expect(swatches).toHaveLength(EVENT_COLORS.length);
    EVENT_COLORS.forEach(({ id, label }, index) => {
      const swatch = swatches[index] as HTMLLabelElement;
      const input = swatch.querySelector('input') as HTMLInputElement;
      const circle = swatch.querySelector('span') as HTMLSpanElement;
      expect(swatch.className).toBe(CSS_CLASSES.SWATCH);
      expect(swatch.title).toBe(label);
      expect(input.className).toBe(CSS_CLASSES.SWATCH_INPUT);
      expect(input.type).toBe(RADIO_TYPE);
      expect(input.name).toBe(COLOR_INPUT_NAME);
      expect(input.value).toBe(id);
      expect(input.getAttribute(ARIA_LABEL_ATTRIBUTE)).toBe(label);
      expect(circle.classList.contains(CSS_CLASSES.SWATCH_CIRCLE)).toBe(true);
      expect(circle.classList.contains(SWATCH_CLASS_PREFIX + id)).toBe(true);
    });
  });
});
