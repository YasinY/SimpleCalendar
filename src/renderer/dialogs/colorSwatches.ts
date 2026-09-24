import { CSS_CLASSES, SWATCH_CLASS_PREFIX } from '../constants';
import { createElement } from '../dom/elements';
import { EVENT_COLORS, type EventColor } from '../events/eventColors';

const COLOR_INPUT_NAME = 'eventColor';
const RADIO_TYPE = 'radio';
const ARIA_LABEL_ATTRIBUTE = 'aria-label';

function createSwatch({ id, label }: EventColor): HTMLLabelElement {
  const swatch = createElement('label', CSS_CLASSES.SWATCH);
  swatch.title = label;

  const input = createElement('input', CSS_CLASSES.SWATCH_INPUT);
  input.type = RADIO_TYPE;
  input.name = COLOR_INPUT_NAME;
  input.value = id;
  input.setAttribute(ARIA_LABEL_ATTRIBUTE, label);

  swatch.append(input, createElement('span', CSS_CLASSES.SWATCH_CIRCLE + ' ' + SWATCH_CLASS_PREFIX + id));
  return swatch;
}

export function buildColorSwatches(group: HTMLElement): void {
  const fragment = document.createDocumentFragment();
  for (const color of EVENT_COLORS) {
    fragment.append(createSwatch(color));
  }
  group.replaceChildren(fragment);
}
