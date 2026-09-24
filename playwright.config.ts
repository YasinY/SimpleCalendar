import { defineConfig } from '@playwright/test';

const TEST_TIMEOUT_MS = 60000;
const EXPECT_TIMEOUT_MS = 10000;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: TEST_TIMEOUT_MS,
  expect: { timeout: EXPECT_TIMEOUT_MS },
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: 'tests/e2e/support/globalSetup.ts',
  globalTeardown: 'tests/e2e/support/globalTeardown.ts',
  use: {
    trace: 'retain-on-failure'
  }
});
