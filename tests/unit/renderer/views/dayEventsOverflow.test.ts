import { beforeEach, describe, expect, it } from 'vitest';
import { fitDayEvents, type DayEventsLayout } from '@renderer/views/dayEventsOverflow';
import { fakeBottom } from '@tests/support/layoutRects';

const PILL_COUNT = 3;
const PILL_HEIGHT = 40;
const LIMITS = { ALL_FIT: 120, TWO_PILLS: 100, ONE_PILL: 60, NOTHING: 10 } as const;
const LABEL_PREFIX = '+';
const EMPTY_LABEL = '';
const ONE_HIDDEN = 1;
const TWO_HIDDEN = 2;

function formatLabel(hiddenCount: number): string {
  return LABEL_PREFIX + hiddenCount;
}

function createLayout(limit: number): DayEventsLayout {
  const list = document.createElement('div');
  const pills = Array.from({ length: PILL_COUNT }, () => document.createElement('button'));
  const moreButton = document.createElement('button');
  fakeBottom(list, () => limit);
  pills.forEach((pill, index) => fakeBottom(pill, () => (index + 1) * PILL_HEIGHT));
  list.append(...pills);
  return { list, pills, moreButton };
}

function visibility(layout: DayEventsLayout): boolean[] {
  return layout.pills.map((pill) => !pill.hidden);
}

describe('fitDayEvents', () => {
  let layout: DayEventsLayout;

  beforeEach(() => {
    layout = createLayout(LIMITS.ALL_FIT);
  });

  it('keeps every pill visible and hides the more button when everything fits', () => {
    fitDayEvents(layout, formatLabel);
    expect(visibility(layout)).toEqual([true, true, true]);
    expect(layout.moreButton.hidden).toBe(true);
    expect(layout.moreButton.textContent).toBe(EMPTY_LABEL);
  });

  it('hides the clipped pills and counts them on the more button', () => {
    layout = createLayout(LIMITS.TWO_PILLS);
    fitDayEvents(layout, formatLabel);
    expect(visibility(layout)).toEqual([true, true, false]);
    expect(layout.moreButton.hidden).toBe(false);
    expect(layout.moreButton.textContent).toBe(formatLabel(ONE_HIDDEN));
  });

  it('hides every pill from the first clipped one on', () => {
    layout = createLayout(LIMITS.ONE_PILL);
    fitDayEvents(layout, formatLabel);
    expect(visibility(layout)).toEqual([true, false, false]);
    expect(layout.moreButton.textContent).toBe(formatLabel(TWO_HIDDEN));
  });

  it('keeps the more button even when no pill fits', () => {
    layout = createLayout(LIMITS.NOTHING);
    fitDayEvents(layout, formatLabel);
    expect(visibility(layout)).toEqual([false, false, false]);
    expect(layout.moreButton.hidden).toBe(false);
    expect(layout.moreButton.textContent).toBe(formatLabel(PILL_COUNT));
  });

  it('reveals previously hidden pills when more space becomes available', () => {
    layout = createLayout(LIMITS.ONE_PILL);
    fitDayEvents(layout, formatLabel);
    fakeBottom(layout.list, () => LIMITS.ALL_FIT);
    fitDayEvents(layout, formatLabel);
    expect(visibility(layout)).toEqual([true, true, true]);
    expect(layout.moreButton.hidden).toBe(true);
  });
});
