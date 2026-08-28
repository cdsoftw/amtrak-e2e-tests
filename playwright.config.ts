import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * `npm test` runs chromium only for fast feedback; `npm run test:all` runs the
 * full matrix. Both projects stay defined so cross-browser is one flag away.
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel. */
  fullyParallel: true,

  /* Fail the build on CI if a `test.only` was left in the source. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only - amtrak.com is a third-party production site. */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Generous relative to the 30s default: the AUT is a heavy production
   * Angular app, not a static page. Deliberately not high enough to mask a
   * genuine hang. */
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  /* `html` alone prints nothing useful to a CI log beyond "run show-report",
   * which turns every failure into a download-and-open chore. `list` gives
   * per-test console output; `github` annotates failures inline on the PR. */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  /* Shared settings for all projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.amtrak.com',

    /* Collect trace when retrying a failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
