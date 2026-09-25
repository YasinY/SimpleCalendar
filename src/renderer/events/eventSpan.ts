import type { DaySegment } from './daySegment';

export interface EventSpan {
  segment: DaySegment;
  start: number;
  end: number;
}
