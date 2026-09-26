import { describe, expect, it } from 'vitest';
import { resolveSplashMinimumDuration } from '@main/startup/splashDuration';
import { SPLASH_MINIMUM_DURATION_ENV_VARIABLE, SPLASH_MINIMUM_DURATION_MS } from '@main/startup/startupConstants';

const OVERRIDE_MS = 250;
const ZERO_MS = 0;

function envWith(value: string): NodeJS.ProcessEnv {
  return { [SPLASH_MINIMUM_DURATION_ENV_VARIABLE]: value };
}

describe('resolveSplashMinimumDuration', () => {
  it('uses the default without an override', () => {
    expect(resolveSplashMinimumDuration({})).toBe(SPLASH_MINIMUM_DURATION_MS);
  });

  it('uses a valid override', () => {
    expect(resolveSplashMinimumDuration(envWith(String(OVERRIDE_MS)))).toBe(OVERRIDE_MS);
  });

  it('allows zero to skip the minimum duration', () => {
    expect(resolveSplashMinimumDuration(envWith(String(ZERO_MS)))).toBe(ZERO_MS);
  });

  it.each(['abc', '-1', 'Infinity'])('falls back to the default for the invalid override %s', (value) => {
    expect(resolveSplashMinimumDuration(envWith(value))).toBe(SPLASH_MINIMUM_DURATION_MS);
  });
});
