import { defineConfig } from 'vitest/config';

const NODE_ENVIRONMENT = 'node';
const DOM_ENVIRONMENT = 'happy-dom';
const BOOTSTRAP_FILES = ['src/main/main.ts', 'src/main/preload.ts', 'src/renderer/app.ts'];
const FULL_COVERAGE_PERCENT = 100;

function project(name: string, include: string[], environment: string) {
  return { test: { name, include, environment } };
}

export default defineConfig({
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
