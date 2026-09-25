import {
  ALL_DAY_LABEL,
  CSS_CLASSES,
  DATASET_KEYS,
  EVENT_COLOR_CLASS_PREFIX,
  SEGMENT_LABELS,
  TIME_RANGE_SEPARATOR,
  TOOLTIP_SEPARATOR
} from '@renderer/constants';
import { createElement } from '@renderer/dom/elements';
import { resolveEventColor } from './eventColors';
import { toEventKey } from './eventKey';
import type { DaySegment } from './daySegment';
import type { CalendarEvent } from '@shared/calendarEvent';

const BUTTON_TYPE = 'button';

export function formatTimeRange(event: Pick<CalendarEvent, 'time' | 'endTime' | 'allDay'>): string {
  if (event.allDay) return ALL_DAY_LABEL;
  if (!event.endTime) return event.time;
  return event.time + TIME_RANGE_SEPARATOR + event.endTime;
}

export function formatSegmentTime({ event, isFirst, isLast }: DaySegment): string {
  if (event.allDay) return ALL_DAY_LABEL;
  if (isFirst && isLast) return formatTimeRange(event);
  if (isFirst) return SEGMENT_LABELS.FROM + event.time;
  if (isLast && event.endTime !== null) return SEGMENT_LABELS.UNTIL + event.endTime;
  return ALL_DAY_LABEL;
}

function buildTooltip(event: CalendarEvent, timeLabel: string): string {
  const lines = [timeLabel + ' ' + event.title];
  if (event.notes) lines.push(event.notes);
  return lines.join(TOOLTIP_SEPARATOR);
}

export function decorateEventPill(pill: HTMLButtonElement, segment: DaySegment): HTMLButtonElement {
  const { event } = segment;
  const timeLabel = formatSegmentTime(segment);
  const classList = pill.classList;
  pill.type = BUTTON_TYPE;
  pill.dataset[DATASET_KEYS.EVENT_KEY] = toEventKey(event);
  pill.title = buildTooltip(event, timeLabel);
  classList.add(EVENT_COLOR_CLASS_PREFIX + resolveEventColor(event.color));
  if (!segment.isFirst) classList.add(CSS_CLASSES.EVENT_CONTINUES_BEFORE);
  if (!segment.isLast) classList.add(CSS_CLASSES.EVENT_CONTINUES_AFTER);
  if (event.recurrence !== null) classList.add(CSS_CLASSES.EVENT_RECURRING);
  pill.append(
    createElement('span', CSS_CLASSES.EVENT_TITLE, event.title),
    createElement('span', CSS_CLASSES.EVENT_TIME, timeLabel)
  );
  return pill;
}
