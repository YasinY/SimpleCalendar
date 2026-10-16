import { TimePicker } from './TimePicker';
import { TIME_PICKER_SELECTORS } from './timePickerConstants';

export function attachTimePickers(root: Element): TimePicker[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TIME_PICKER_SELECTORS.FIELD), (field) => new TimePicker(field));
}
