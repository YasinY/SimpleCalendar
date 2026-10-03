import { vi } from 'vitest';

const RESIZE_OBSERVER_GLOBAL = 'ResizeObserver';

export interface ResizeObserverStub {
  observed: Element[];
  trigger(): void;
}

export function stubResizeObserver(): ResizeObserverStub {
  const callbacks: ResizeObserverCallback[] = [];
  const observed: Element[] = [];

  class FakeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      callbacks.push(callback);
    }

    observe(element: Element): void {
      observed.push(element);
    }

    unobserve(): void {}

    disconnect(): void {}
  }

  vi.stubGlobal(RESIZE_OBSERVER_GLOBAL, FakeResizeObserver);
  return {
    observed,
    trigger: () => {
      for (const callback of callbacks) callback([], {} as ResizeObserver);
    }
  };
}
