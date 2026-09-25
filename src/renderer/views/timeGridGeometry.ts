import { DRAG_SNAP_MINUTES, MINUTES_PER_DAY } from '@renderer/constants';

const LAST_SNAP_START = MINUTES_PER_DAY - DRAG_SNAP_MINUTES;
const FIRST_MINUTE = 0;

export function minutesFromPointer(column: HTMLElement, clientY: number): number {
  const rect = column.getBoundingClientRect();
  return ((clientY - rect.top) / rect.height) * MINUTES_PER_DAY;
}

export function snapMinutes(minutes: number): number {
  const snapped = Math.round(minutes / DRAG_SNAP_MINUTES) * DRAG_SNAP_MINUTES;
  return Math.min(LAST_SNAP_START, Math.max(FIRST_MINUTE, snapped));
}
