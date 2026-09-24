import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { EventDialog } from '../../../../src/renderer/dialogs/EventDialog';
import { DiscardPrompt } from '../../../../src/renderer/dialogs/DiscardPrompt';
import {
  ALL_DAY_TIME,
  DEFAULT_EVENT_TIME,
  DIALOG_LABELS,
  HIDDEN_ATTRIBUTE,
  NO_END_TIME,
  REMINDER_NONE_VALUE,
  REMINDER_OPTIONS
} from '../../../../src/renderer/constants';
import { formatLongDate, fromIsoDate } from '../../../../src/renderer/date/dateUtils';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from '../../../../src/renderer/events/eventColors';
import type { EventInput } from '../../../../src/shared/eventInput';
import { createCalendarEvent } from '../../../support/calendarEventFactory';
import { mountIndexDocument, requireById } from '../../../support/indexDocument';

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

interface DialogFixture {
  dialog: EventDialog;
  overlay: HTMLElement;
  form: HTMLFormElement;
  heading: HTMLElement;
  dateLabel: HTMLElement;
  titleInput: HTMLInputElement;
  timeInput: HTMLInputElement;
  endTimeInput: HTMLInputElement;
  allDayInput: HTMLInputElement;
  notesInput: HTMLTextAreaElement;
  reminderSelect: HTMLSelectElement;
  colorGroup: HTMLElement;
  submitButton: HTMLButtonElement;
  deleteButton: HTMLButtonElement;
  onSubmit: Mock<(payload: EventInput) => void>;
  onDelete: Mock<(eventId: string) => void>;
}

function query<T extends Element>(root: HTMLElement, selector: string): T {
  return root.querySelector(selector) as T;
}

function createFixture(): DialogFixture {
  const overlay = requireById(OVERLAY_ID);
  const onSubmit = vi.fn<(payload: EventInput) => void>();
  const onDelete = vi.fn<(eventId: string) => void>();
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
    allDayInput: query(overlay, SELECTORS.ALL_DAY_INPUT),
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

  it('fills the reminder select and color swatches on construction', () => {
    const { reminderSelect, colorGroup } = createFixture();

    expect(Array.from(reminderSelect.options, (option) => option.value)).toEqual(REMINDER_OPTIONS.map(({ value }) => value));
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
    expect(fixture.titleInput.value).toBe('');
    expect(fixture.timeInput.value).toBe(DEFAULT_EVENT_TIME);
    expect(fixture.endTimeInput.value).toBe(NO_END_TIME);
    expect(fixture.allDayInput.checked).toBe(false);
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

  it('opens an edit form prefilled from a timed event with end time', () => {
    const fixture = createFixture();
    const event = createCalendarEvent({
      title: TITLE,
      notes: NOTES,
      endTime: END_TIME,
      color: KNOWN_COLOR,
      reminderMinutes: REMINDER_MINUTES
    });

    fixture.dialog.openForEvent(event);

    expect(fixture.heading.textContent).toBe(DIALOG_LABELS.EDIT_TITLE);
    expect(fixture.submitButton.textContent).toBe(DIALOG_LABELS.EDIT_SUBMIT);
    expect(fixture.deleteButton.hidden).toBe(false);
    expect(fixture.titleInput.value).toBe(TITLE);
    expect(fixture.timeInput.value).toBe(event.time);
    expect(fixture.endTimeInput.value).toBe(END_TIME);
    expect(fixture.notesInput.value).toBe(NOTES);
    expect(fixture.reminderSelect.value).toBe(String(REMINDER_MINUTES));
    expect(checkedColor(fixture.colorGroup)).toBe(KNOWN_COLOR);
    expect(fixture.dateLabel.textContent).toBe(formatLongDate(fromIsoDate(event.date)));
  });

  it('opens an all day event without end time, unknown color and no reminder', () => {
    const fixture = createFixture();

    fixture.dialog.openForEvent(createCalendarEvent({ allDay: true, color: UNKNOWN_COLOR }));

    expect(fixture.endTimeInput.value).toBe(NO_END_TIME);
    expect(fixture.allDayInput.checked).toBe(true);
    expect(fixture.timeInput.disabled).toBe(true);
    expect(fixture.endTimeInput.disabled).toBe(true);
    expect(fixture.reminderSelect.value).toBe(REMINDER_NONE_VALUE);
    expect(checkedColor(fixture.colorGroup)).toBe(DEFAULT_EVENT_COLOR);
  });

  it('submits a trimmed timed payload for the active event', () => {
    const fixture = createFixture();
    const event = createCalendarEvent({ endTime: END_TIME, color: KNOWN_COLOR, reminderMinutes: REMINDER_MINUTES });
    fixture.dialog.openForEvent(event);
    fixture.titleInput.value = PADDED_TITLE;
    fixture.notesInput.value = PADDED_NOTES;

    expect(submit(fixture)).toEqual({
      id: event.id,
      date: event.date,
      time: event.time,
      endTime: END_TIME,
      allDay: false,
      color: KNOWN_COLOR,
      title: TITLE,
      notes: NOTES,
      reminderMinutes: REMINDER_MINUTES
    });
  });

  it('submits an all day payload without times for a new event', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE, CUSTOM_TIME);
    fixture.allDayInput.checked = true;

    expect(submit(fixture)).toEqual({
      id: null,
      date: ISO_DATE,
      time: ALL_DAY_TIME,
      endTime: null,
      allDay: true,
      color: DEFAULT_EVENT_COLOR,
      title: '',
      notes: '',
      reminderMinutes: null
    });
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
    expect(fixture.onDelete).toHaveBeenCalledExactlyOnceWith(event.id);
  });

  it('toggles the time inputs when all day changes', () => {
    const fixture = createFixture();
    fixture.dialog.openForDate(ISO_DATE);

    fixture.allDayInput.checked = true;
    fixture.allDayInput.dispatchEvent(new Event('change'));

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
