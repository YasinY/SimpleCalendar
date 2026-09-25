import { afterEach, describe, expect, it, vi } from 'vitest';
import { runWithTransition } from '@renderer/dom/transitions';
import { REDUCED_MOTION_QUERY, TRANSITION_DATASET_KEY, TRANSITION_DIRECTIONS } from '@renderer/constants';

const START_VIEW_TRANSITION = 'startViewTransition';
const DIRECTION = TRANSITION_DIRECTIONS.FORWARD;

function mockReducedMotion(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches } as MediaQueryList);
}

function stubStartViewTransition(finished: Promise<void>): ReturnType<typeof vi.fn> {
  const startViewTransition = vi.fn((callback: () => void) => {
    callback();
    return { finished };
  });
  Object.defineProperty(document, START_VIEW_TRANSITION, { value: startViewTransition, configurable: true });
  return startViewTransition;
}

function transitionDataset(): string | undefined {
  return document.documentElement.dataset[TRANSITION_DATASET_KEY];
}

describe('runWithTransition', () => {
  afterEach(() => {
    Reflect.deleteProperty(document, START_VIEW_TRANSITION);
    vi.restoreAllMocks();
  });

  it('runs the update directly when view transitions are unsupported', () => {
    Reflect.deleteProperty(document, START_VIEW_TRANSITION);
    const update = vi.fn();

    runWithTransition(DIRECTION, update);

    expect(update).toHaveBeenCalledOnce();
    expect(transitionDataset()).toBeUndefined();
  });

  it('runs the update directly when reduced motion is preferred', () => {
    mockReducedMotion(true);
    const startViewTransition = stubStartViewTransition(Promise.resolve());
    const update = vi.fn();

    runWithTransition(DIRECTION, update);

    expect(window.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
    expect(update).toHaveBeenCalledOnce();
    expect(startViewTransition).not.toHaveBeenCalled();
  });

  it('marks the direction during the view transition and clears it afterwards', async () => {
    mockReducedMotion(false);
    let finish: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const startViewTransition = stubStartViewTransition(finished);
    const update = vi.fn();

    runWithTransition(DIRECTION, update);

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    expect(transitionDataset()).toBe(DIRECTION);

    finish();
    await finished;
    await Promise.resolve();

    expect(transitionDataset()).toBeUndefined();
  });
});
