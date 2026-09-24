import type { WeatherIconName } from './weatherIconName';

export const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
export const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

export const GEOCODING_PARAMS = { count: '1', language: 'de', format: 'json' } as const;
export const FORECAST_PARAMS = { current: 'temperature_2m,weather_code', timezone: 'auto' } as const;

export const WEATHER_REFRESH_INTERVAL_MS = 1800000;
export const WEATHER_STALE_AFTER_MS = 600000;

export const TEMPERATURE_SUFFIX = '°';
export const WEATHER_TOOLTIP_SEPARATOR = ' · ';

export interface WeatherCondition {
  codes: number[];
  label: string;
  icon: WeatherIconName;
}

export const UNKNOWN_CONDITION: WeatherCondition = { codes: [], label: 'Unbekannt', icon: 'cloud' };

export const WEATHER_CONDITIONS: WeatherCondition[] = [
  { codes: [0], label: 'Klar', icon: 'sun' },
  { codes: [1], label: 'Überwiegend klar', icon: 'sun' },
  { codes: [2], label: 'Teilweise bewölkt', icon: 'cloudSun' },
  { codes: [3], label: 'Bedeckt', icon: 'cloud' },
  { codes: [45, 48], label: 'Nebel', icon: 'fog' },
  { codes: [51, 53, 55, 56, 57], label: 'Nieselregen', icon: 'drizzle' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: 'Regen', icon: 'rain' },
  { codes: [71, 73, 75, 77, 85, 86], label: 'Schnee', icon: 'snow' },
  { codes: [95, 96, 99], label: 'Gewitter', icon: 'thunder' }
];

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
const SVG_CLOSE = '</svg>';

const ICON_PATHS: Record<WeatherIconName, string> = {
  sun: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  cloudSun: '<path d="M12 2v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="M20 12h2"/><path d="m19.07 4.93-1.41 1.41"/><path d="M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
  fog: '<path d="M4 9h12"/><path d="M8 13h12"/><path d="M5 17h10"/>',
  drizzle: '<line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
  rain: '<line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>',
  snow: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="8" y1="20" x2="8.01" y2="20"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="22" x2="12.01" y2="22"/><line x1="16" y1="16" x2="16.01" y2="16"/><line x1="16" y1="20" x2="16.01" y2="20"/>',
  thunder: '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"/><polyline points="13 11 9 17 15 17 11 23"/>'
};

export const WEATHER_ICONS: Record<WeatherIconName, string> = Object.fromEntries(
  Object.entries(ICON_PATHS).map(([name, paths]) => [name, SVG_OPEN + paths + SVG_CLOSE])
) as Record<WeatherIconName, string>;
