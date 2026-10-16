export const HOLIDAY_RULE = {
  FIXED: 'fixed',
  EASTER_RELATIVE: 'easterRelative',
  REPENTANCE_DAY: 'repentanceDay',
  SUNDAY_RELATIVE: 'sundayRelative'
} as const;

export type HolidayRule = (typeof HOLIDAY_RULE)[keyof typeof HOLIDAY_RULE];
