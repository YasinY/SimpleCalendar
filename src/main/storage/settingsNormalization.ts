import type { Settings } from '../../shared/settings';

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function pickKnownKeys(source: Record<string, unknown>, knownKeys: string[]): Partial<Settings> {
  const picked: Record<string, unknown> = {};
  for (const key of knownKeys) {
    if (key in source) picked[key] = source[key];
  }
  return picked as Partial<Settings>;
}
