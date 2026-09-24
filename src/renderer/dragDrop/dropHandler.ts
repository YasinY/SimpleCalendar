import type { DragPayload } from './dragPayload';

export type DropHandler = (payload: DragPayload, zone: HTMLElement, domEvent: DragEvent) => void;
