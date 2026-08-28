import { test } from '@playwright/test';

/**
 * Scope: the "Find trains" search form on amtrak.com/home, up to and including
 * the FIND TRAINS button click. The search results page and all other post-click
 * behavior is out of scope.
 */

test.fixme('Find Trains button enabled once origin, destination, and depart date set', async () => {
  // The submit button is disabled until all three inputs are satisfied.
  // Asserting it is disabled first validates both ends of that logic.
  //
  // - Station autocomplete ignores fill() - it needs pressSequentially().
  // - The depart-date input can't be clicked (a floating <label> intercepts
  //   pointer events); fill() focuses it without a pointer event.
});
