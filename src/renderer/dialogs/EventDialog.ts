import {
  ALL_DAY_TIME,
  DEFAULT_EVENT_TIME,
  DIALOG_LABELS,
  NO_END_TIME,
  NO_NOTES,
  REMINDER_NONE_VALUE,
  REMINDER_OPTIONS
} from '../constants';
import { formatLongDate, fromIsoDate } from '../date/dateUtils';
import { requireElement } from '../dom/elements';
import { fillSelect } from '../dom/selectOptions';
import { DEFAULT_EVENT_COLOR, resolveEventColor } from '../events/eventColors';
import { buildColorSwatches } from './colorSwatches';
import { DialogOverlay } from './DialogOverlay';
import type { DiscardPrompt } from './DiscardPrompt';
import { toEndTime, toReminderMinutes, toReminderValue } from './eventFormValues';
import type { EventDialogHandlers } from './eventDialogHandlers';
import type { EventEditor } from './eventEditor';
import type { CalendarEvent } from '../../shared/calendarEvent';
import type { EventInput } from '../../shared/eventInput';

const SELECTORS = {
  FORM: '[data-dialog-form]',
  HEADING: '[data-dialog-heading]',
  DATE_LABEL: '[data-dialog-date]',
  TITLE_INPUT: '[data-dialog-title]',
  TIME_INPUT: '[data-dialog-time]',
  END_TIME_INPUT: '[data-dialog-end-time]',
  ALL_DAY_INPUT: '[data-dialog-all-day]',
  NOTES_INPUT: '[data-dialog-notes]',
  REMINDER_SELECT: '[data-dialog-reminder]',
  COLOR_GROUP: '[data-dialog-colors]',
  SUBMIT_BUTTON: '[data-dialog-submit]',
  DELETE_BUTTON: '[data-dialog-delete]',
  CANCEL_BUTTON: '[data-dialog-cancel]'
} as const;

const COLOR_INPUT_SELECTOR = 'input';
const CHECKED_COLOR_SELECTOR = COLOR_INPUT_SELECTOR + ':checked';
const EMPTY_TITLE = '';

export class EventDialog implements EventEditor {
  readonly #overlay: DialogOverlay;
  readonly #form: HTMLFormElement;
  readonly #heading: HTMLElement;
  readonly #dateLabel: HTMLElement;
  readonly #titleInput: HTMLInputElement;
  readonly #timeInput: HTMLInputElement;
  readonly #endTimeInput: HTMLInputElement;
  readonly #allDayInput: HTMLInputElement;
  readonly #notesInput: HTMLTextAreaElement;
  readonly #reminderSelect: HTMLSelectElement;
  readonly #colorGroup: HTMLElement;
  readonly #submitButton: HTMLButtonElement;
  readonly #deleteButton: HTMLButtonElement;
  readonly #handlers: EventDialogHandlers;
  #activeDate: string | null = null;
  #activeEvent: CalendarEvent | null = null;

  constructor(overlayElement: HTMLElement, handlers: EventDialogHandlers, discardPrompt: DiscardPrompt) {
    this.#overlay = new DialogOverlay(overlayElement, {
      cancelSelector: SELECTORS.CANCEL_BUTTON,
      discardPrompt,
      onDismiss: () => this.close()
    });
    this.#form = requireElement(overlayElement, SELECTORS.FORM);
    this.#heading = requireElement(overlayElement, SELECTORS.HEADING);
    this.#dateLabel = requireElement(overlayElement, SELECTORS.DATE_LABEL);
    this.#titleInput = requireElement(overlayElement, SELECTORS.TITLE_INPUT);
    this.#timeInput = requireElement(overlayElement, SELECTORS.TIME_INPUT);
    this.#endTimeInput = requireElement(overlayElement, SELECTORS.END_TIME_INPUT);
    this.#allDayInput = requireElement(overlayElement, SELECTORS.ALL_DAY_INPUT);
    this.#notesInput = requireElement(overlayElement, SELECTORS.NOTES_INPUT);
    this.#reminderSelect = requireElement(overlayElement, SELECTORS.REMINDER_SELECT);
    this.#colorGroup = requireElement(overlayElement, SELECTORS.COLOR_GROUP);
    this.#submitButton = requireElement(overlayElement, SELECTORS.SUBMIT_BUTTON);
    this.#deleteButton = requireElement(overlayElement, SELECTORS.DELETE_BUTTON);
    this.#handlers = handlers;
    fillSelect(this.#reminderSelect, REMINDER_OPTIONS);
    buildColorSwatches(this.#colorGroup);
    this.#bindInteractions();
  }

  openForDate(isoDate: string, time: string = DEFAULT_EVENT_TIME): void {
    this.#activeDate = isoDate;
    this.#activeEvent = null;
    this.#heading.textContent = DIALOG_LABELS.CREATE_TITLE;
    this.#submitButton.textContent = DIALOG_LABELS.CREATE_SUBMIT;
    this.#deleteButton.hidden = true;
    this.#titleInput.value = EMPTY_TITLE;
    this.#timeInput.value = time;
    this.#endTimeInput.value = NO_END_TIME;
    this.#allDayInput.checked = false;
    this.#notesInput.value = NO_NOTES;
    this.#reminderSelect.value = REMINDER_NONE_VALUE;
    this.#selectColor(DEFAULT_EVENT_COLOR);
    this.#applyAllDayState();
    this.#show(isoDate);
  }

  openForEvent(event: CalendarEvent): void {
    this.#activeDate = event.date;
    this.#activeEvent = event;
    this.#heading.textContent = DIALOG_LABELS.EDIT_TITLE;
    this.#submitButton.textContent = DIALOG_LABELS.EDIT_SUBMIT;
    this.#deleteButton.hidden = false;
    this.#titleInput.value = event.title;
    this.#timeInput.value = event.time;
    this.#endTimeInput.value = event.endTime ?? NO_END_TIME;
    this.#allDayInput.checked = event.allDay;
    this.#notesInput.value = event.notes;
    this.#reminderSelect.value = toReminderValue(event.reminderMinutes);
    this.#selectColor(resolveEventColor(event.color));
    this.#applyAllDayState();
    this.#show(event.date);
  }

  close(): void {
    this.#overlay.hide();
    this.#activeDate = null;
    this.#activeEvent = null;
  }

  #selectColor(colorId: string): void {
    for (const input of this.#colorGroup.querySelectorAll<HTMLInputElement>(COLOR_INPUT_SELECTOR)) {
      input.checked = input.value === colorId;
    }
  }

  #selectedColor(): string {
    return this.#colorGroup.querySelector<HTMLInputElement>(CHECKED_COLOR_SELECTOR)?.value ?? DEFAULT_EVENT_COLOR;
  }

  #applyAllDayState(): void {
    const allDay = this.#allDayInput.checked;
    this.#timeInput.disabled = allDay;
    this.#endTimeInput.disabled = allDay;
  }

  #show(isoDate: string): void {
    this.#dateLabel.textContent = formatLongDate(fromIsoDate(isoDate));
    this.#overlay.show();
    this.#titleInput.focus();
    this.#titleInput.select();
  }

  #bindInteractions(): void {
    this.#form.addEventListener('submit', (domEvent) => {
      domEvent.preventDefault();
      this.#handlers.onSubmit(this.#collectPayload());
    });

    this.#deleteButton.addEventListener('click', () => {
      if (!this.#activeEvent) return;
      this.#handlers.onDelete(this.#activeEvent.id);
    });

    this.#allDayInput.addEventListener('change', () => this.#applyAllDayState());
  }

  #collectPayload(): EventInput {
    const allDay = this.#allDayInput.checked;
    return {
      id: this.#activeEvent?.id ?? null,
      date: this.#activeDate ?? EMPTY_TITLE,
      time: allDay ? ALL_DAY_TIME : this.#timeInput.value,
      endTime: allDay ? null : toEndTime(this.#endTimeInput.value),
      allDay,
      color: this.#selectedColor(),
      title: this.#titleInput.value.trim(),
      notes: this.#notesInput.value.trim(),
      reminderMinutes: toReminderMinutes(this.#reminderSelect.value)
    };
  }
}
