import type { RecurrenceFrequency } from './recurrenceFrequency';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  until: string | null;
}
