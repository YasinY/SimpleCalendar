import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EventDialog } from '@renderer/dialogs/EventDialog';
import { DiscardPrompt } from '@renderer/dialogs/DiscardPrompt';
import {
  ALL_DAY_TIME,
  DEFAULT_EVENT_TIME,
  DIALOG_LABELS,
  HIDDEN_ATTRIBUTE,
  NO_DATE,
  NO_END_TIME,
  RECURRENCE_NONE_VALUE,
  RECURRENCE_OPTIONS,
  RECURRENCE_UNIT_LABELS,
  REMINDER_NONE_VALUE,
  REMINDER_OPTIONS
} from '@renderer/constants';
import { formatLongDate, fromIsoDate } from '@renderer/date/dateUtils';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from '@renderer/events/eventColors';
import type { CalendarEvent } from '@shared/calendarEvent';
import type { EventInput } from '@shared/eventInput';
import type { Recurrence } from '@shared/recurrence';
import { createCalendarEvent } from '@tests/support/calendarEventFactory';
import { mountIndexDocument, requireById } from '@tests/support/indexDocument';

const OVERLAY_ID = 'dialogOverlay';
const DISCARD_OVERLAY_ID = 'discardOverlay';
const ISO_DATE = '2026-09-16';
const CUSTOM_TIME = '14:30';
const END_TIME = '11:00';
const REMINDER_MINUTES = 15;
const KNOWN_COLOR = EVENT_COLORS[1].id;
const UNKNOWN_COLOR = 'magenta';
const TITLE = 'Meeting';
const NOTES = 'Raum 4';
const PADDED_TITLE = '  ' + TITLE + '  ';
const PADDED_NOTES = '  ' + NOTES + '  ';
const EMPTY_DATE = '';
const EMPTY_TEXT = '';
const END_DATE = '2026-09-18';
const UNTIL_DATE = '2026-12-31';
const INTERVAL = 2;
const DEFAULT_INTERVAL_VALUE = '1';
const MONTHLY_RECURRENCE: Recurrence = { frequency: 'monthly', interval: INTERVAL, until: UNTIL_DATE };
const WEEKLY_FREQUENCY = 'weekly';
const CHANGE_EVENT = 'change';

const SELECTORS = {
  FORM: '[data-dialog-form]',
  HEADING: '[data-dialog-heading]',
  DATE_LABEL: '[data-dialog-date]',
  TITLE_INPUT: '[data-dialog-title]',
  TIME_INPUT: '[data-dialog-time]',
  END_TIME_INPUT: '[data-dialog-end-time]',
  END_DATE_INPUT: '[data-dialog-end-date]',
  END_DATE_FIELD: '[data-dialog-end-date-field]',
  ALL_DAY_INPUT: '[data-dialog-all-day]',
  MULTI_DAY_INPUT: '[data-dialog-multi-day]',
  DATE_PICKER: '[data-date-picker]',
  RECURRENCE_SELECT: '[data-dialog-recurrence]',
  RECURRENCE_DETAILS: '[data-dialog-recurrence-details]',
  INTERVAL_INPUT: '[data-dialog-interval]',
  INTERVAL_UNIT: '[data-dialog-interval-unit]',
  UNTIL_INPUT: '[data-dialog-until]',
  NOTES_INPUT: '[data-dialog-notes]',
  REMINDER_SELECT: '[data-dialog-reminder]',
  COLOR_GROUP: '[data-dialog-colors]',
  SUBMIT_BUTTON: '[data-dialog-submit]',
  DELETE_BUTTON: '[data-dialog-delete]',
  CANCEL_BUTTON: '[data-dialog-cancel]'
} as const;

interface DialogFixture {
  dialog: EventDialog;
  overlay: HTMLElement;
  form: HTMLFormElement;
  heading: HTMLElement;
  dateLabel: HTMLElement;
  titleInput: HTMLInputElement;
  timeInput: HTMLInputElement;
  endTimeInput: HTMLInputElement;
  endDateInput: HTMLInputElement;
  endDateField: HTMLElement;
  allDayInput: HTMLInputElement;
  multiDayInput: HTMLInputElement;
  recurrenceSelect: HTMLSelectElement;
  recurrenceDetails: HTMLElement;
  intervalInput: HTMLInputElement;
  intervalUnit: HTMLElement;
  untilInput: HTMLInputElement;
  notesInput: HTMLTextAreaElement;
  reminderSelect: HTMLSelectElement;
  colorGroup: HTMLElement;
  submitButton: HTMLButtonElement;
  deleteButton: HTMLButtonElement;
  onSubmit: Mock<(payload: EventInput, editing: CalendarEvent | null) => void>;
  onDelete: Mock<(event: CalendarEvent) => void>;
}

function query<T extends Element>(root: HTMLElement, selector: string): T {
  return root.querySelector(selector) as T;
}

function createFixture(): DialogFixture {
  const overlay = requireById(OVERLAY_ID);
  const onSubmit = vi.fn<(payload: EventInput, editing: CalendarEvent | null) => void>();
  const onDelete = vi.fn<(event: CalendarEvent) => void>();
  const dialog = new EventDialog(overlay, { onSubmit, onDelete }, new DiscardPrompt(requireById(DISCARD_OVERLAY_ID)));
  return {
    dialog,
    overlay,
    form: query(overlay, SELECTORS.FORM),
    heading: query(overlay, SELECTORS.HEADING),
    dateLabel: query(overlay, SELECTORS.DATE_LABEL),
    titleInput: query(overlay, SELECTORS.TITLE_INPUT),
    timeInput: query(overlay, SELECTORS.TIME_INPUT),
    endTimeInput: query(overlay, SELECTORS.END_TIME_INPUT),
    endDateInput: query(overlay, SELECTORS.END_DATE_INPUT),
    endDateField: query(overlay, SELECTORS.END_DATE_FIELD),
    allDayInput: query(overlay, SELECTORS.ALL_DAY_INPUT),
    multiDayInput: query(overlay, SELECTORS.MULTI_DAY_INPUT),
    recurrenceSelect: query(overlay, SELECTORS.RECURRENCE_SELECT),
    recurrenceDetails: query(overlay, SELECTORS.RECURRENCE_DETAILS),
    intervalInput: query(overlay, SELECTORS.INTERVAL_INPUT),
    intervalUnit: query(overlay, SELECTORS.INTERVAL_UNIT),
    untilInput: query(overlay, SELECTORS.UNTIL_INPUT),
    notesInput: query(overlay, SELECTORS.NOTES_INPUT),
    reminderSelect: query(overlay, SELECTORS.REMINDER_SELECT),
    colorGroup: query(overlay, SELECTORS.COLOR_GROUP),
    submitButton: query(overlay, SELECTORS.SUBMIT_BUTTON),
    deleteButton: query(overlay, SELECTORS.DELETE_BUTTON),
    onSubmit,
    onDelete
  };
}

function checkedColor(colorGroup: HTMLElement): string | undefined {
  return colorGroup.querySelector<HTMLInputElement>('input:checked')?.value;
}

function submit(fixture: DialogFixture): EventInput {
  fixture.form.dispatchEvent(new Event('submit', { cancelable: true }));
  return fixture.onSubmit.mock.lastCall?.[0] as EventInput;
}

describe('EventDialog', () => {
  beforeEach(() => {
    mountIndexDocument();
  });

  it('fills the reminder and recurrence selects and color swatches on construction', () => {
    const { reminderSelect, recurrenceSelect, colorGroup } = createFixture();

    expect(Array.from(reminderSelect.options, (option) => option.value)).toEqual(REMINDER_OPTIONS.map(({ value }) => value));
    expect(Array.from(recurrenceSelect.options, (option) => option.value)).toEqual(RECURRENCE_OPTIONS.map(({ value }) => value));
    expect(colorGroup.querySelectorAll('input')).toHaveLength(EVENT_COLORS.length);
  });

  it('opens a blank create form for a date with the default time', () => {
    const fixture = createFixture();

    fixture.dialog.openForDate(ISO_DATE);

    expect(fixture.overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(false);
    expect(fixture.heading.textContent).toBe(DIALOG_LABELS.CREATE_TITLE);
    expect(fixture.submitButton.textContent).toBe(DIALOG_LABELS.CREATE_SUBMIT);
    expect(fixture.dateLabel.textContent).toBe(formatLongDate(fromIsoDate(ISO_DATE)));
    expect(fixture.deleteButton.hidden).toBe(true);
    expect(fixture.titleInput.value).toBe(EMPTY_TEXT);
    expect(fixture.timeInput.value).toBe(DEFAULT_EVENT_TIME);
    expect(fixture.endTimeInput.value).toBe(NO_END_TIME);
    expect(fixture.endDateInput.value).toBe(NO_DATE);
    expect(fixture.endDateInput.min).toBe(ISO_DATE);
    expect(fixture.endDateField.hidden).toBe(true);
    expect(fixture.allDayInput.checked).toBe(false);
    expect(fixture.multiDayInput.checked).toBe(false);
    expect(fixture.recurrenceSelect.value).toBe(RECURRENCE_NONE_VALUE);
    expect(fixture.recurrenceDetails.hidden).toBe(true);
    expect(fixture.intervalInput.value).toBe(DEFAULT_INTERVAL_VALUE);
    expect(fixture.intervalUnit.textContent).toBe(EMPTY_TEXT);
    expect(fixture.untilInput.value).toBe(NO_DATE);
    expect(fixture.untilInput.min).toBe(ISO_DATE);
    expect(fixture.timeInput.disabled).toBe(false);
    expect(fixture.reminderSelect.value).toBe(REMINDER_NONE_VALUE);
    expect(checkedColor(fixture.colorGroup)).toBe(DEFAULT_EVENT_COLOR);
    expect(document.activeElement).toBe(fixture.titleInput);
  });

  it('opens a create form with a given time', () => {
    const fixture = createFixture();

    fixture.dialog.openForDate(ISO_DATE, CUSTOM_TIME);

    expect(fixture.timeInput.value).toBe(CUSTOM_TIME);
  });

  it('opens an edit form prefilled from a timed recurring multi day event with end time', () => {
    const fixture = createFixture();
    const event = createCalendarEvent({
      title: TITLE,
      notes: NOTES,
      endTime: END_TIME,
      endDate: END_DATE,
      color: KNOWN_COLOR,
      reminderMinutes: REMINDER_MINUTES,
      recurrence: MONTHLY_RECURRENCE
    });

    fixture.dialog.openForEvent(event);

    expect(fixture.heading.textContent).toBe(DIALOG_LABELS.EDIT_TITLE);
    expect(fixture.submitButton.textContent).toBe(DIALOG_LABELS.EDIT_SUBMIT);
    expect(fixture.deleteButton.hidden).toBe(false);
    expect(fixture.titleInput.value).toBe(TITLE);
    expect(fixture.timeInput.value).toBe(event.time);
    expect(fixture.endTimeInput.value).toBe(END_TIME);
    expect(fixture.endDateInput.value).toBe(END_DATE);
    expect(fixture.endDateInput.min).toBe(event.date);
    expect(fixture.multiDayInput.checked).toBe(true);
    expect(fixture.endDateField.hidden).toBe(false);
    expect(fixture.recurrenceSelect.value).toBe(MONTHLY_RECURRENCE.frequency);
    expect(fixture.recurrenceDetails.hidden).toBe(false);
    expect(fixture.intervalInput.value).toBe(String(INTERVAL));
    expect(fixture.intervalUnit.textContent).toBe(RECURRENCE_UNIT_LABELS[MONTHLY_RECURRENCE.frequency]);
    expect(fixture.untilInput.value).toBe(UNTIL_DATE);
    expect(fixture.untilInput.min).toBe(event.date);
    expect(fixture.notesInput.value).toBe(NOTES);
    expect(fixture.reminderSelect.value).toBe(String(REMINDER_MINUTES));
    expect(checkedColor(fixture.colorGroup)).toBe(KNOWN_COLOR);
    expect(fixture.dateLabel.textContent).toBe(formatLongDate(fromIsoDate(event.date)));
  });

  it('opens an all day event without end time, unknown color and no reminder', () => {
    const fixture = createFixture();

    fixture.dialog.openForEvent(createCalendarEvent({ allDay: true, color: UNKNOWN_COLOR }));

    expect(fixture.endTimeInput.value).toBe(NO_END_TIME);
    expect(fixture.endDateInput.value).toBe(NO_DATE);
    expect(fixture.multiDayInput.checked).toBe(false);
    expect(fixture.endDateField.hidden).toBe(true);
    expect(fixture.recurrenceSelect.value).toBe(RECURRENCE_NONE_VALUE);
    expect(fixture.recurrenceDetails.hidden).toBe(true);
    expect(fixture.allDayInput.checked).toBe(true);
    expect(fixture.timeInput.disabled).toBe(true);
    expect(fixture.endTimeInput.disabled).toBe(true);
    expect(fixture.reminderSelect.value).toBe(REMINDER_NONE_VALUE);
    expect(checkedColor(fixture.colorGroup)).toBe(DEFAULT_EVENT_COLOR);
  });

  it('submits a trimmed timed payload for the active event', () => {
    const fixture = createFixture();
    const event = createCalendarEvent({
      endTime: END_TIME,
      endDate: END_DATE,
      color: KNOWN_COLOR,
      reminderMinutes: REMINDER_MINUTES,
      recurrence: MONTHLY_RECURRENCE
    });
    fixture.dialog.openForEvent(event);
    fixture.titleInput.value = PADDED_TITLE;
    fixture.notesInput.value = PADDED_NOTES;

    expect(submit(fixture)).toEqual({
      id: event.id,
      occurrenceDate: event.date,
      date: event.date,
      endDate: END_DATE,
      time: event.time,
      endTime: END_TIME,
      allDay: false,
      color: KNOWN_COLOR,
      title: TITLE,
      notes: NOTES,
      reminderMinutes: REMINDER_MINUTES,
      recurrence: MONTHLY_RECURRENCE
    });
    expect(fixture.onSubmit.mock.lastCall?.[1]).toBe(event);
  });

  it('submits an all day payload without times for a new event', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE, CUSTOM_TIME);
    fixture.allDayInput.checked = true;

    expect(submit(fixture)).toEqual({
      id: null,
      occurrenceDate: null,
      date: ISO_DATE,
      endDate: null,
      time: ALL_DAY_TIME,
      endTime: null,
      allDay: true,
      color: DEFAULT_EVENT_COLOR,
      title: EMPTY_TEXT,
      notes: EMPTY_TEXT,
      reminderMinutes: null,
      recurrence: null
    });
    expect(fixture.onSubmit.mock.lastCall?.[1]).toBeNull();
  });

  it('shows the recurrence details with the unit once a frequency is chosen and submits it', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE);

    fixture.recurrenceSelect.value = WEEKLY_FREQUENCY;
    fixture.recurrenceSelect.dispatchEvent(new Event(CHANGE_EVENT));

    expect(fixture.recurrenceDetails.hidden).toBe(false);
    expect(fixture.intervalUnit.textContent).toBe(RECURRENCE_UNIT_LABELS[WEEKLY_FREQUENCY]);
    expect(submit(fixture).recurrence).toEqual({ frequency: WEEKLY_FREQUENCY, interval: Number(DEFAULT_INTERVAL_VALUE), until: null });

    fixture.recurrenceSelect.value = RECURRENCE_NONE_VALUE;
    fixture.recurrenceSelect.dispatchEvent(new Event(CHANGE_EVENT));

    expect(fixture.recurrenceDetails.hidden).toBe(true);
    expect(fixture.intervalUnit.textContent).toBe(EMPTY_TEXT);
  });

  it('falls back to the default color when no swatch is checked', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE);
    for (const input of fixture.colorGroup.querySelectorAll('input')) {
      input.checked = false;
    }

    expect(submit(fixture).color).toBe(DEFAULT_EVENT_COLOR);
  });

  it('deletes only while an event is being edited', () => {
    const fixture = createFixture();
    const event = createCalendarEvent();

    fixture.dialog.openForDate(ISO_DATE);
    fixture.deleteButton.click();
    expect(fixture.onDelete).not.toHaveBeenCalled();

    fixture.dialog.openForEvent(event);
    fixture.deleteButton.click();
    expect(fixture.onDelete).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('reveals the end date once multi day is checked and drops it again when unchecked', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE);

    fixture.multiDayInput.checked = true;
    fixture.multiDayInput.dispatchEvent(new Event(CHANGE_EVENT));
    fixture.endDateInput.value = END_DATE;

    expect(fixture.endDateField.hidden).toBe(false);
    expect(submit(fixture).endDate).toBe(END_DATE);

    fixture.multiDayInput.checked = false;
    fixture.multiDayInput.dispatchEvent(new Event(CHANGE_EVENT));

    expect(fixture.endDateField.hidden).toBe(true);
    expect(submit(fixture).endDate).toBeNull();
  });

  it('submits no end date when multi day is checked without a date', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE);
    fixture.multiDayInput.checked = true;

    expect(submit(fixture).endDate).toBeNull();
  });

  it('attaches a date picker to the end date and until fields', () => {
    const fixture = createFixture();
    const [endDatePicker, untilPicker] = fixture.overlay.querySelectorAll<HTMLElement>(SELECTORS.DATE_PICKER);

    endDatePicker.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }));
    untilPicker.dispatchEvent(Object.assign(new Event('toggle'), { newState: 'open' }));

    expect(endDatePicker.childElementCount).toBeGreaterThan(0);
    expect(untilPicker.childElementCount).toBeGreaterThan(0);
  });

  it('toggles the time inputs when all day changes', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE);

    fixture.allDayInput.checked = true;
    fixture.allDayInput.dispatchEvent(new Event(CHANGE_EVENT));

    expect(fixture.timeInput.disabled).toBe(true);
    expect(fixture.endTimeInput.disabled).toBe(true);
  });

  it('hides and resets the active event on close', () => {
    const fixture = createFixture();
    fixture.dialog.openForEvent(createCalendarEvent());

    fixture.dialog.close();

    expect(fixture.overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
    const payload = submit(fixture);
    expect(payload.id).toBeNull();
    expect(payload.date).toBe(EMPTY_DATE);
  });

  it('closes via the cancel button', () => {
    const fixture = createFixture();
    fixture.dialog.openForEvent(createCalendarEvent());

    query<HTMLButtonElement>(fixture.overlay, SELECTORS.CANCEL_BUTTON).click();

    expect(fixture.overlay.hasAttribute(HIDDEN_ATTRIBUTE)).toBe(true);
    expect(submit(fixture).id).toBeNull();
  });
});
