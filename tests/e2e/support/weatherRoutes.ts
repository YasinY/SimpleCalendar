import type { Page, Route } from '@playwright/test';

export const GEOCODING_ROUTE = 'https://geocoding-api.open-meteo.com/**';
export const FORECAST_ROUTE = 'https://api.open-meteo.com/**';

const CORS_HEADERS = { 'access-control-allow-origin': '*' };
const CITY_QUERY_PARAMETER = 'name';
const SERVER_ERROR_STATUS = 500;

export const DEFAULT_COORDINATES = { latitude: 53.55, longitude: 9.99 };

export interface ForecastStub {
  temperature: number;
  code: number;
}

export type RouteFailure = 'serverError' | 'networkError';

function fulfillJson(route: Route, json: unknown): Promise<void> {
  return route.fulfill({ json, headers: CORS_HEADERS });
}

function requestedCity(route: Route): string {
  return new URL(route.request().url()).searchParams.get(CITY_QUERY_PARAMETER) ?? '';
}

export async function mockGeocoding(page: Page): Promise<string[]> {
  const requestedCities: string[] = [];
  await page.route(GEOCODING_ROUTE, (route) => {
    const city = requestedCity(route);
    requestedCities.push(city);
    return fulfillJson(route, { results: [{ name: city, ...DEFAULT_COORDINATES }] });
  });
  return requestedCities;
}

export async function mockEmptyGeocoding(page: Page): Promise<void> {
  await page.route(GEOCODING_ROUTE, (route) => fulfillJson(route, {}));
}

export async function mockForecast(page: Page, stub: ForecastStub): Promise<URL[]> {
  const requestedUrls: URL[] = [];
  await page.route(FORECAST_ROUTE, (route) => {
    requestedUrls.push(new URL(route.request().url()));
    return fulfillJson(route, { current: { temperature_2m: stub.temperature, weather_code: stub.code } });
  });
  return requestedUrls;
}

export async function failRoute(page: Page, pattern: string, failure: RouteFailure): Promise<void> {
  await page.route(pattern, (route) => {
    if (failure === 'networkError') return route.abort();
    return route.fulfill({ status: SERVER_ERROR_STATUS, headers: CORS_HEADERS });
  });
}
