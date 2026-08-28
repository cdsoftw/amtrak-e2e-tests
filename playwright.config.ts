import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * `npm test` runs chromium only; `npm run test:all` runs the full matrix
 */
export default defineConfig({
  testDir: './tests',

  /* Run tests in files in parallel. */
  fullyParallel: true,

  /* Fail the build on CI if a `test.only` was left in the source. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only - GitHub workers are more constrained than local dev
   * machines, so flakiness there is more likely. */
  retries: process.env.CI ? 2 : 0,

  /* Capped at 2 due to flakiness occurring locally at higher values. The limit
   * is not the site refusing traffic (confirmed via concurrent API calls).
   * Instead, it seems that once several browsers are rendering this page at
   * once, the animated suggestion dropdown stops being reliable enough to pass
   * Playwright's stability check before the click. Opt out of parallel tests
   * entirely on CI. */
  workers: process.env.CI ? 1 : 2,

  /* Doubled from the default values to give extra headroom on slower PCs or CI runners. */
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  /* `html` alone prints nothing useful to a CI log beyond "run show-report".
   * `list` gives per-test console output, `github` annotates failures inline
   * on the PR. */
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],

  /* Shared settings for all projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.amtrak.com',

    /* Bounds every action and every `locator.waitFor`. */
    actionTimeout: 15_000,

    /* Amtrak ships its own automation hooks under this attribute - this lets
     * us use the built-in getByTestId() instead of a raw attribute selector. */
    testIdAttribute: 'amt-auto-test-id',

    /* Collect trace when retrying a failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        /* use the new Chrome for Testing build instead of `chromium-headless-shell` */
        channel: 'chromium',
      },
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
