import { test as base } from '@playwright/test';
import { FindTrainsForm } from '../pages/find-trains-form.page';

/**
 * Extends the base test with a `findTrains` fixture: an instance of the page
 * object, already navigated and past the cookie banner.
 *
 * The fixture stops at "the form is on screen and interactive". Verifying the
 * form's initial state is a test in its own right.
 */
export const test = base.extend<{ findTrains: FindTrainsForm }>({
  findTrains: async ({ page }, use) => {
    const findTrains = new FindTrainsForm(page);
    await findTrains.goto();
    // the banner is cookie-backed and appears once per browser context
    await findTrains.dismissCookieBannerIfPresent();
    await use(findTrains);
  },
});

export { expect } from '@playwright/test';
