export interface DayEventsLayout {
  list: HTMLElement;
  pills: HTMLElement[];
  moreButton: HTMLElement;
}

export type MoreLabelFormatter = (hiddenCount: number) => string;

const NONE_CLIPPED = -1;

function bottomOf(element: Element): number {
  return element.getBoundingClientRect().bottom;
}

function showPillsUpTo(pills: HTMLElement[], visibleCount: number): void {
  pills.forEach((pill, index) => {
    pill.hidden = index >= visibleCount;
  });
}

export function fitDayEvents({ list, pills, moreButton }: DayEventsLayout, formatLabel: MoreLabelFormatter): void {
  showPillsUpTo(pills, pills.length);
  moreButton.hidden = true;
  const limit = bottomOf(list);
  const firstClipped = pills.findIndex((pill) => bottomOf(pill) > limit);
  if (firstClipped === NONE_CLIPPED) return;

  showPillsUpTo(pills, firstClipped);
  moreButton.textContent = formatLabel(pills.length - firstClipped);
  moreButton.hidden = false;
}
