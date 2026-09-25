const ISO_SEPARATOR = '-';
const ISO_DATE_PAD = 2;
const PAD_CHARACTER = '0';
const MONTH_OFFSET = 1;
const FIRST_MONTH_DAY = 1;
const NO_DAYS = 0;
const MILLISECONDS_PER_DAY = 86400000;

function pad(value: number): string {
  return String(value).padStart(ISO_DATE_PAD, PAD_CHARACTER);
}

export function toIsoDate(date: Date): string {
  return [date.getFullYear(), pad(date.getMonth() + MONTH_OFFSET), pad(date.getDate())].join(ISO_SEPARATOR);
}

export function fromIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split(ISO_SEPARATOR).map(Number);
  return new Date(year, month - MONTH_OFFSET, day);
}

export function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

export function addMonthsKeepingDay(date: Date, delta: number): Date {
  const firstOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + delta, FIRST_MONTH_DAY);
  const daysInTargetMonth = new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth() + MONTH_OFFSET, NO_DAYS).getDate();
  return new Date(firstOfTargetMonth.getFullYear(), firstOfTargetMonth.getMonth(), Math.min(date.getDate(), daysInTargetMonth));
}

export function shiftIsoDate(isoDate: string, days: number): string {
  return toIsoDate(addDays(fromIsoDate(isoDate), days));
}

export function daysBetween(fromIso: string, toIso: string): number {
  const from = fromIsoDate(fromIso);
  const to = fromIsoDate(toIso);
  return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / MILLISECONDS_PER_DAY);
}
