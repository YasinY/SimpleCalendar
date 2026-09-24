import { describe, expect, it, vi } from 'vitest';
import { DROP_EFFECT_MOVE } from '../../../../src/renderer/constants';
import { DRAG_EVENTS, allowDrop, makeDraggable, readDragPayload, startDrag } from '../../../../src/renderer/dragDrop/dragTransfer';
import { createDragEvent, createRawTransfer, readTransferPayload } from '../../../support/dragEvents';

const PAYLOAD = { eventId: 'event-1', offsetMinutes: 30 };
const INVALID_JSON = '{not json';

describe('dragTransfer', () => {
  it('writes the payload and move effect when starting a drag', () => {
    const dataTransfer = new DataTransfer();
    startDrag(dataTransfer, PAYLOAD);
    expect(readTransferPayload(dataTransfer)).toEqual(PAYLOAD);
    expect(dataTransfer.effectAllowed).toBe(DROP_EFFECT_MOVE);
  });

  it('reads a valid payload back', () => {
    const dataTransfer = new DataTransfer();
    startDrag(dataTransfer, PAYLOAD);
    expect(readDragPayload(dataTransfer)).toEqual(PAYLOAD);
  });

  it('returns null for invalid payload json', () => {
    expect(readDragPayload(createRawTransfer(INVALID_JSON))).toBeNull();
  });

  it('allows the drop and sets the move effect when a data transfer exists', () => {
    const dataTransfer = new DataTransfer();
    const domEvent = createDragEvent(DRAG_EVENTS.OVER, { dataTransfer });
    allowDrop(domEvent);
    expect(domEvent.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe(DROP_EFFECT_MOVE);
  });

  it('allows the drop without a data transfer', () => {
    const domEvent = createDragEvent(DRAG_EVENTS.OVER);
    allowDrop(domEvent);
    expect(domEvent.defaultPrevented).toBe(true);
  });

  it('makes an element draggable and starts the drag with the built payload', () => {
    const element = document.createElement('div');
    const buildPayload = vi.fn(() => PAYLOAD);
    makeDraggable(element, buildPayload);
    const dataTransfer = new DataTransfer();
    const domEvent = createDragEvent(DRAG_EVENTS.START, { dataTransfer });
    element.dispatchEvent(domEvent);

    expect(element.draggable).toBe(true);
    expect(buildPayload).toHaveBeenCalledWith(domEvent);
    expect(readTransferPayload(dataTransfer)).toEqual(PAYLOAD);
  });

  it('ignores a drag start without a data transfer', () => {
    const element = document.createElement('div');
    const buildPayload = vi.fn(() => PAYLOAD);
    makeDraggable(element, buildPayload);
    element.dispatchEvent(createDragEvent(DRAG_EVENTS.START));
    expect(buildPayload).not.toHaveBeenCalled();
  });
});
