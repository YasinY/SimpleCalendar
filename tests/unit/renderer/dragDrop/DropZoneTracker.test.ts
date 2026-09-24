import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DROP_EFFECT_MOVE } from '../../../../src/renderer/constants';
import { DRAG_EVENTS } from '../../../../src/renderer/dragDrop/dragTransfer';
import { DropZoneTracker } from '../../../../src/renderer/dragDrop/DropZoneTracker';
import { createDragEvent, createPayloadTransfer, createRawTransfer } from '../../../support/dragEvents';
import type { DropHandler } from '../../../../src/renderer/dragDrop/dropHandler';

const ZONE_CLASS = 'zone';
const ZONE_SELECTOR = '.' + ZONE_CLASS;
const HIGHLIGHT_CLASS = 'highlight';
const HIGHLIGHT_SELECTOR = '.' + HIGHLIGHT_CLASS;
const PAYLOAD = { eventId: 'event-1', offsetMinutes: 0 };
const INVALID_JSON = '{not json';

function createZone(): HTMLElement {
  const zone = document.createElement('div');
  zone.className = ZONE_CLASS;
  zone.append(document.createElement('span'));
  return zone;
}

function isHighlighted(zone: HTMLElement): boolean {
  return zone.classList.contains(HIGHLIGHT_CLASS);
}

function dragOver(target: Element, dataTransfer: DataTransfer | null = null): DragEvent {
  const domEvent = createDragEvent(DRAG_EVENTS.OVER, { dataTransfer });
  target.dispatchEvent(domEvent);
  return domEvent;
}

function drop(target: Element, dataTransfer: DataTransfer | null = null): DragEvent {
  const domEvent = createDragEvent(DRAG_EVENTS.DROP, { dataTransfer });
  target.dispatchEvent(domEvent);
  return domEvent;
}

describe('DropZoneTracker', () => {
  let container: HTMLElement;
  let firstZone: HTMLElement;
  let secondZone: HTMLElement;
  let outside: HTMLElement;
  let onDrop: ReturnType<typeof vi.fn<DropHandler>>;

  beforeEach(() => {
    container = document.createElement('div');
    firstZone = createZone();
    secondZone = createZone();
    outside = document.createElement('div');
    container.append(firstZone, secondZone, outside);
    document.body.replaceChildren(container);
    onDrop = vi.fn<DropHandler>();
    new DropZoneTracker(container, { zoneSelector: ZONE_SELECTOR, highlightClass: HIGHLIGHT_CLASS, onDrop });
  });

  it('highlights the zone under the pointer and allows the drop', () => {
    const dataTransfer = new DataTransfer();
    const domEvent = dragOver(firstZone.firstElementChild as Element, dataTransfer);
    expect(isHighlighted(firstZone)).toBe(true);
    expect(domEvent.defaultPrevented).toBe(true);
    expect(dataTransfer.dropEffect).toBe(DROP_EFFECT_MOVE);
  });

  it('does nothing when dragging over a non-zone element', () => {
    const domEvent = dragOver(outside);
    expect(domEvent.defaultPrevented).toBe(false);
    expect(container.querySelector(HIGHLIGHT_SELECTOR)).toBeNull();
  });

  it('moves the highlight when switching zones', () => {
    dragOver(firstZone);
    dragOver(secondZone);
    expect(isHighlighted(firstZone)).toBe(false);
    expect(isHighlighted(secondZone)).toBe(true);
  });

  it('keeps the highlight when dragging over the same zone again', () => {
    dragOver(firstZone);
    dragOver(firstZone);
    expect(isHighlighted(firstZone)).toBe(true);
  });

  it('keeps the highlight when leaving towards an element inside the container', () => {
    dragOver(firstZone);
    firstZone.dispatchEvent(createDragEvent(DRAG_EVENTS.LEAVE, { relatedTarget: secondZone }));
    expect(isHighlighted(firstZone)).toBe(true);
  });

  it('removes the highlight when leaving towards an element outside the container', () => {
    dragOver(firstZone);
    firstZone.dispatchEvent(createDragEvent(DRAG_EVENTS.LEAVE, { relatedTarget: document.body }));
    expect(isHighlighted(firstZone)).toBe(false);
  });

  it('removes the highlight when leaving without a related target', () => {
    dragOver(firstZone);
    firstZone.dispatchEvent(createDragEvent(DRAG_EVENTS.LEAVE));
    expect(isHighlighted(firstZone)).toBe(false);
  });

  it('ignores a drop outside of any zone and clears the highlight', () => {
    dragOver(firstZone);
    const domEvent = drop(outside, createPayloadTransfer(PAYLOAD));
    expect(domEvent.defaultPrevented).toBe(false);
    expect(isHighlighted(firstZone)).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('ignores a drop without a data transfer', () => {
    const domEvent = drop(firstZone);
    expect(domEvent.defaultPrevented).toBe(false);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('ignores a drop with an invalid payload', () => {
    const domEvent = drop(firstZone, createRawTransfer(INVALID_JSON));
    expect(domEvent.defaultPrevented).toBe(true);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it('reports a valid drop with payload, zone and event', () => {
    const domEvent = drop(secondZone.firstElementChild as Element, createPayloadTransfer(PAYLOAD));
    expect(onDrop).toHaveBeenCalledWith(PAYLOAD, secondZone, domEvent);
  });

  it('removes the highlight when the drag ends anywhere in the document', () => {
    dragOver(firstZone);
    document.dispatchEvent(createDragEvent(DRAG_EVENTS.END));
    expect(isHighlighted(firstZone)).toBe(false);
  });
});
