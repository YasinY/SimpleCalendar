import type { MoveTarget } from './moveTarget';

export interface MonthViewHandlers {
  onDayActivate: (isoDate: string) => void;
  onEventActivate: (eventId: string) => void;
  onEventDrop: (eventId: string, target: MoveTarget) => void;
}
