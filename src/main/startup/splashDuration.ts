import { SPLASH_MINIMUM_DURATION_ENV_VARIABLE, SPLASH_MINIMUM_DURATION_MS } from './startupConstants';

const MINIMUM_ALLOWED_MS = 0;

export function resolveSplashMinimumDuration(env: NodeJS.ProcessEnv): number {
  const override = env[SPLASH_MINIMUM_DURATION_ENV_VARIABLE];
  if (override === undefined) return SPLASH_MINIMUM_DURATION_MS;
  const parsed = Number(override);
  if (!Number.isFinite(parsed) || parsed < MINIMUM_ALLOWED_MS) return SPLASH_MINIMUM_DURATION_MS;
  return parsed;
}
