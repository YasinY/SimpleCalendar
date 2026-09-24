import { DRAG_DATA_TYPE, DROP_EFFECT_MOVE } from '../constants';
import type { DragPayload } from './dragPayload';

export const DRAG_EVENTS = {
  START: 'dragstart',
  OVER: 'dragover',
  LEAVE: 'dragleave',
  DROP: 'drop',
  END: 'dragend'
} as const;

export function startDrag(dataTransfer: DataTransfer, payload: DragPayload): void {
  dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(payload));
  dataTransfer.effectAllowed = DROP_EFFECT_MOVE;
}

export function readDragPayload(dataTransfer: DataTransfer): DragPayload | null {
  try {
    return JSON.parse(dataTransfer.getData(DRAG_DATA_TYPE)) as DragPayload;
  } catch {
    return null;
  }
}

export function allowDrop(domEvent: DragEvent): void {
  domEvent.preventDefault();
  if (domEvent.dataTransfer) domEvent.dataTransfer.dropEffect = DROP_EFFECT_MOVE;
}

export function makeDraggable(element: HTMLElement, buildPayload: (domEvent: DragEvent) => DragPayload): void {
  element.draggable = true;
  element.addEventListener(DRAG_EVENTS.START, (domEvent) => {
    if (!domEvent.dataTransfer) return;
    startDrag(domEvent.dataTransfer, buildPayload(domEvent));
  });
}
