import { DatePicker } from './DatePicker';
import { DATE_PICKER_SELECTORS } from './datePickerConstants';

export function attachDatePickers(root: Element): DatePicker[] {
  return Array.from(root.querySelectorAll<HTMLElement>(DATE_PICKER_SELECTORS.FIELD), (field) => new DatePicker(field));
}
