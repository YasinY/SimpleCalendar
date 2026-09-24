import type { MonthCell } from './monthCell';

export interface MonthGrid {
  cells: MonthCell[];
  weekCount: number;
  years: number[];
}
