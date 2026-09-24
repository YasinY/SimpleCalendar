import {
  ALL_DAY_LABEL,
  CSS_CLASSES,
  DATASET_KEYS,
  EVENT_COLOR_CLASS_PREFIX,
  TIME_RANGE_SEPARATOR,
  TOOLTIP_SEPARATOR
} from '../constants';
import { createElement } from '../dom/elements';
import { resolveEventColor } from './eventColors';
import type { CalendarEvent } from '../../shared/calendarEvent';

const BUTTON_TYPE = 'button';

export function formatTimeRange(event: Pick<CalendarEvent, 'time' | 'endTime' | 'allDay'>): string {
  if (event.allDay) return ALL_DAY_LABEL;
  if (!event.endTime) return event.time;
  return event.time + TIME_RANGE_SEPARATOR + event.endTime;
}

function buildTooltip(event: CalendarEvent, timeLabel: string): string {
  const lines = [timeLabel + ' ' + event.title];
  if (event.notes) lines.push(event.notes);
  return lines.join(TOOLTIP_SEPARATOR);
}

export function decorateEventPill(pill: HTMLButtonElement, event: CalendarEvent): HTMLButtonElement {
  const timeLabel = formatTimeRange(event);
  pill.type = BUTTON_TYPE;
  pill.dataset[DATASET_KEYS.EVENT_ID] = event.id;
  pill.title = buildTooltip(event, timeLabel);
  pill.classList.add(EVENT_COLOR_CLASS_PREFIX + resolveEventColor(event.color));
  pill.append(
    createElement('span', CSS_CLASSES.EVENT_TITLE, event.title),
    createElement('span', CSS_CLASSES.EVENT_TIME, timeLabel)
  );
  return pill;
}
