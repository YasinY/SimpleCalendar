import { REDUCED_MOTION_QUERY, TRANSITION_DATASET_KEY, type TransitionDirection } from '@renderer/constants';

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function runWithTransition(direction: TransitionDirection, update: () => void): void {
  const root = document.documentElement;
  if (typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    update();
    return;
  }
  const dataset = root.dataset;
  dataset[TRANSITION_DATASET_KEY] = direction;
  const transition = document.startViewTransition(() => update());
  void transition.finished.finally(() => {
    delete dataset[TRANSITION_DATASET_KEY];
  });
}
