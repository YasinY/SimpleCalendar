export interface EventColor {
  id: string;
  label: string;
}

export const EVENT_COLORS: EventColor[] = [
  { id: 'blue', label: 'Blau' },
  { id: 'red', label: 'Rot' },
  { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Gelb' },
  { id: 'green', label: 'Grün' },
  { id: 'teal', label: 'Türkis' },
  { id: 'purple', label: 'Lila' },
  { id: 'gray', label: 'Grau' }
];

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].id;

const KNOWN_COLOR_IDS = new Set(EVENT_COLORS.map((color) => color.id));

export function resolveEventColor(colorId: string | null | undefined): string {
  return colorId !== null && colorId !== undefined && KNOWN_COLOR_IDS.has(colorId) ? colorId : DEFAULT_EVENT_COLOR;
}
