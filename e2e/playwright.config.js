import { defineConfig } from '@playwright/test';

// Tests run against an already-running instance of the app. Start it first
// (e.g. `docker compose up`), then `npm test`. Override the URL with BASE_URL.
const baseURL = process.env.BASE_URL || 'http://localhost:8080';

export default defineConfig({
  testDir: './tests',
  // The suite shares one database, so keep it serial and predictable.
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
      testIgnore: /mobile\.spec\.js/,
    },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 } },
      testMatch: /mobile\.spec\.js/,
    },
  ],
});
