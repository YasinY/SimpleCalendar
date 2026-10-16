import type { State } from './state';

export interface HolidayCountry {
  code: string;
  name: string;
  nationwideLabel: string;
  states: State[];
}
