import { describe, expect, it } from 'vitest';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS, resolveEventColor } from '@renderer/events/eventColors';

const KNOWN_COLOR = EVENT_COLORS[2].id;
const UNKNOWN_COLOR = 'magenta';

describe('resolveEventColor', () => {
  it('falls back to the default color for missing or unknown ids', () => {
    expect(resolveEventColor(null)).toBe(DEFAULT_EVENT_COLOR);
    expect(resolveEventColor(undefined)).toBe(DEFAULT_EVENT_COLOR);
    expect(resolveEventColor(UNKNOWN_COLOR)).toBe(DEFAULT_EVENT_COLOR);
  });

  it('keeps known color ids', () => {
    expect(resolveEventColor(KNOWN_COLOR)).toBe(KNOWN_COLOR);
  });
});
