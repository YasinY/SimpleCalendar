import { FORECAST_ENDPOINT, FORECAST_PARAMS, UNKNOWN_CONDITION, WEATHER_CONDITIONS, type WeatherCondition } from './weatherConstants';
import type { CurrentWeather } from './currentWeather';
import type { ForecastResponse } from './forecastResponse';
import type { WeatherLocation } from '@shared/weatherLocation';

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

export async function fetchCurrentWeather(location: WeatherLocation): Promise<CurrentWeather> {
  const params = { ...FORECAST_PARAMS, latitude: String(location.latitude), longitude: String(location.longitude) };
  const data = await fetchJson<ForecastResponse>(buildUrl(FORECAST_ENDPOINT, params));
  const current = data.current;
  return { temperature: current.temperature_2m, code: current.weather_code };
}

export function resolveCondition(code: number): WeatherCondition {
  return WEATHER_CONDITIONS.find((condition) => condition.codes.includes(code)) ?? UNKNOWN_CONDITION;
}
