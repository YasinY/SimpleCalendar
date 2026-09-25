import { describe, expect, it } from 'vitest';
import { UNKNOWN_CONDITION, WEATHER_CONDITIONS, WEATHER_ICONS } from '@renderer/weather/weatherConstants';

const SVG_START = '<svg';
const SVG_END = '</svg>';
const ICON_NAMES = ['sun', 'cloudSun', 'cloud', 'fog', 'drizzle', 'rain', 'snow', 'thunder'];
const CLEAR_CODE = 0;
const FOG_CODE = 48;
const THUNDER_CODE = 99;

function findLabel(code: number): string | undefined {
  return WEATHER_CONDITIONS.find((condition) => condition.codes.includes(code))?.label;
}

describe('weatherConstants', () => {
  it('builds a complete svg for every icon', () => {
    expect(Object.keys(WEATHER_ICONS)).toEqual(ICON_NAMES);
    for (const icon of Object.values(WEATHER_ICONS)) {
      expect(icon.startsWith(SVG_START)).toBe(true);
      expect(icon.endsWith(SVG_END)).toBe(true);
    }
  });

  it('maps wmo codes to conditions', () => {
    expect(findLabel(CLEAR_CODE)).toBe('Klar');
    expect(findLabel(FOG_CODE)).toBe('Nebel');
    expect(findLabel(THUNDER_CODE)).toBe('Gewitter');
  });

  it('uses only known icons for every condition', () => {
    for (const condition of [...WEATHER_CONDITIONS, UNKNOWN_CONDITION]) {
      expect(ICON_NAMES).toContain(condition.icon);
    }
  });
});
