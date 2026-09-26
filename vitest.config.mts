import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const NODE_ENVIRONMENT = 'node';
const DOM_ENVIRONMENT = 'happy-dom';
const BOOTSTRAP_FILES = [
  'src/main/main.ts',
  'src/main/preload.ts',
  'src/main/splashPreload.ts',
  'src/renderer/app.ts',
  'src/renderer/splash.ts'
];
const FULL_COVERAGE_PERCENT = 100;
const PATH_ALIASES = {
  '@shared': 'src/shared',
  '@main': 'src/main',
  '@renderer': 'src/renderer',
  '@tests': 'tests'
};

function resolveAliases() {
  return Object.fromEntries(
    Object.entries(PATH_ALIASES).map(([alias, dir]) => [alias, fileURLToPath(new URL(dir, import.meta.url))])
  );
}

function project(name: string, include: string[], environment: string) {
  return { test: { name, include, environment } };
}

export default defineConfig({
  resolve: { alias: resolveAliases() },
  test: {
    projects: [
      project('unit-main', ['tests/unit/main/**/*.test.ts', 'tests/unit/shared/**/*.test.ts'], NODE_ENVIRONMENT),
      project('unit-renderer', ['tests/unit/renderer/**/*.test.ts'], DOM_ENVIRONMENT),
      project('integration-main', ['tests/integration/main/**/*.test.ts'], NODE_ENVIRONMENT),
      project('integration-renderer', ['tests/integration/renderer/**/*.test.ts'], DOM_ENVIRONMENT)
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: BOOTSTRAP_FILES,
      thresholds: {
        statements: FULL_COVERAGE_PERCENT,
        branches: FULL_COVERAGE_PERCENT,
        functions: FULL_COVERAGE_PERCENT,
        lines: FULL_COVERAGE_PERCENT
      }
    }
  }
});
