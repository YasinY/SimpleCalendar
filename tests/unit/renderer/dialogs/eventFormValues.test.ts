import { describe, expect, it } from 'vitest';
import { toEndTime, toReminderMinutes, toReminderValue } from '../../../../src/renderer/dialogs/eventFormValues';
import { NO_END_TIME, REMINDER_NONE_VALUE } from '../../../../src/renderer/constants';

const REMINDER_MINUTES = 15;
const END_TIME = '10:30';

describe('eventFormValues', () => {
  it('converts reminder minutes to select values', () => {
    expect(toReminderValue(null)).toBe(REMINDER_NONE_VALUE);
    expect(toReminderValue(REMINDER_MINUTES)).toBe(String(REMINDER_MINUTES));
  });

  it('converts select values back to reminder minutes', () => {
    expect(toReminderMinutes(REMINDER_NONE_VALUE)).toBeNull();
    expect(toReminderMinutes(String(REMINDER_MINUTES))).toBe(REMINDER_MINUTES);
  });

  it('treats an empty end time as no end time', () => {
    expect(toEndTime(NO_END_TIME)).toBeNull();
    expect(toEndTime(END_TIME)).toBe(END_TIME);
  });
});
