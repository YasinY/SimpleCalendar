import {
  FORECAST_ENDPOINT,
  FORECAST_PARAMS,
  GEOCODING_ENDPOINT,
  GEOCODING_PARAMS,
  UNKNOWN_CONDITION,
  WEATHER_CONDITIONS,
  type WeatherCondition
} from './weatherConstants';
import type { CurrentWeather } from './currentWeather';
import type { ForecastResponse } from './forecastResponse';
import type { GeocodingResponse } from './geocodingResponse';
import type { WeatherLocation } from '../../shared/weatherLocation';

const FIRST_RESULT = 0;

function buildUrl(endpoint: string, params: Record<string, string>): URL {
  const url = new URL(endpoint);
  url.search = new URLSearchParams(params).toString();
  return url;
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(response.statusText);
  return (await response.json()) as T;
}

export async function geocodeCity(city: string): Promise<WeatherLocation | null> {
  const data = await fetchJson<GeocodingResponse>(buildUrl(GEOCODING_ENDPOINT, { ...GEOCODING_PARAMS, name: city }));
  const match = data.results?.[FIRST_RESULT];
  if (!match) return null;
  return { city, name: match.name, latitude: match.latitude, longitude: match.longitude };
}

export async function fetchCurrentWeather(location: WeatherLocation): Promise<CurrentWeather> {
  const params = { ...FORECAST_PARAMS, latitude: String(location.latitude), longitude: String(location.longitude) };
  const data = await fetchJson<ForecastResponse>(buildUrl(FORECAST_ENDPOINT, params));
  const current = data.current;
  return { temperature: current.temperature_2m, code: current.weather_code };
}

export function resolveCondition(code: number): WeatherCondition {
  return WEATHER_CONDITIONS.find((condition) => condition.codes.includes(code)) ?? UNKNOWN_CONDITION;
}
