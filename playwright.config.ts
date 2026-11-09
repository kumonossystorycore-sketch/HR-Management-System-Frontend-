import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests against the real API and a production build of the web app.
 *   npm run build -w frontend && npm run test:e2e -w frontend
 * They need MySQL running with migrations and the seed applied (backend/README.md).
 * globalSetup creates the e2e accounts (backend `npm run e2e:fixture`).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'lo-LA',
    timezoneId: 'Asia/Vientiane',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ },
  ],
  webServer: [
    {
      command: 'npm run dev -w backend',
      cwd: '..',
      url: 'http://localhost:4000/api/v1/health',
      reuseExistingServer: true,
      env: { JOBS_ENABLED: 'false' },
      timeout: 60_000,
    },
    {
      command: 'npm run start',
      url: 'http://localhost:3000/lo/login',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
