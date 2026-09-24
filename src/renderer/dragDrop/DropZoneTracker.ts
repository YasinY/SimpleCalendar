import { closestElement } from '../dom/elements';
import { DRAG_EVENTS, allowDrop, readDragPayload } from './dragTransfer';
import type { DropHandler } from './dropHandler';
import type { DropZoneOptions } from './dropZoneOptions';

export class DropZoneTracker {
  readonly #container: HTMLElement;
  readonly #zoneSelector: string;
  readonly #highlightClass: string;
  readonly #onDrop: DropHandler;
  #activeZone: HTMLElement | null = null;

  constructor(container: HTMLElement, { zoneSelector, highlightClass, onDrop }: DropZoneOptions) {
    this.#container = container;
    this.#zoneSelector = zoneSelector;
    this.#highlightClass = highlightClass;
    this.#onDrop = onDrop;
    this.#bind();
  }

  #bind(): void {
    const container = this.#container;
    container.addEventListener(DRAG_EVENTS.OVER, (domEvent) => {
      const zone = closestElement(domEvent.target, this.#zoneSelector);
      if (!zone) return;
      allowDrop(domEvent);
      this.#highlight(zone);
    });

    container.addEventListener(DRAG_EVENTS.LEAVE, (domEvent) => {
      if (domEvent.relatedTarget instanceof Node && container.contains(domEvent.relatedTarget)) return;
      this.#highlight(null);
    });

    container.addEventListener(DRAG_EVENTS.DROP, (domEvent) => {
      const zone = closestElement(domEvent.target, this.#zoneSelector);
      this.#highlight(null);
      if (!zone || !domEvent.dataTransfer) return;
      domEvent.preventDefault();
      const payload = readDragPayload(domEvent.dataTransfer);
      if (!payload) return;
      this.#onDrop(payload, zone, domEvent);
    });

    document.addEventListener(DRAG_EVENTS.END, () => this.#highlight(null));
  }

  #highlight(zone: HTMLElement | null): void {
    if (this.#activeZone === zone) return;
    this.#activeZone?.classList.remove(this.#highlightClass);
    zone?.classList.add(this.#highlightClass);
    this.#activeZone = zone;
  }
}
