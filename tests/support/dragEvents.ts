import { DRAG_DATA_TYPE } from '../../src/renderer/constants';
import type { DragPayload } from '../../src/renderer/dragDrop/dragPayload';

export interface DragEventFields {
  dataTransfer?: DataTransfer | null;
  clientY?: number;
  relatedTarget?: EventTarget | null;
}

const DEFAULT_CLIENT_Y = 0;

export function createDragEvent(type: string, { dataTransfer = null, clientY = DEFAULT_CLIENT_Y, relatedTarget = null }: DragEventFields = {}): DragEvent {
  const domEvent = new DragEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(domEvent, 'dataTransfer', { value: dataTransfer });
  Object.defineProperty(domEvent, 'clientY', { value: clientY });
  Object.defineProperty(domEvent, 'relatedTarget', { value: relatedTarget });
  return domEvent;
}

export function createRawTransfer(data: string): DataTransfer {
  const dataTransfer = new DataTransfer();
  dataTransfer.setData(DRAG_DATA_TYPE, data);
  return dataTransfer;
}

export function createPayloadTransfer(payload: DragPayload): DataTransfer {
  return createRawTransfer(JSON.stringify(payload));
}

export function readTransferPayload(dataTransfer: DataTransfer): DragPayload {
  return JSON.parse(dataTransfer.getData(DRAG_DATA_TYPE)) as DragPayload;
}
