import type { MoveTarget } from './moveTarget';

export interface TimeGridHandlers {
  onEventActivate: (eventId: string) => void;
  onSlotActivate: (isoDate: string, time: string) => void;
  onEventDrop: (eventId: string, target: MoveTarget) => void;
}
