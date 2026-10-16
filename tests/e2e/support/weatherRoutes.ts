import type { Page, Route } from '@playwright/test';

export const FORECAST_ROUTE = 'https://api.open-meteo.com/**';

const CORS_HEADERS = { 'access-control-allow-origin': '*' };
const SERVER_ERROR_STATUS = 500;

export const HAMBURG_COORDINATES = { latitude: 53.55, longitude: 9.99 };

export interface ForecastStub {
  temperature: number;
  code: number;
}

export type RouteFailure = 'serverError' | 'networkError';

function fulfillJson(route: Route, json: unknown): Promise<void> {
  return route.fulfill({ json, headers: CORS_HEADERS });
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
