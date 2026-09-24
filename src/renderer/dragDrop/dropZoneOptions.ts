import type { DropHandler } from './dropHandler';

export interface DropZoneOptions {
  zoneSelector: string;
  highlightClass: string;
  onDrop: DropHandler;
}
