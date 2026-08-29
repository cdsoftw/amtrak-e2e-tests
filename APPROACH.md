# Testing Approach

### Application Under Test (AUT):

[Amtrak - Find trains](https://www.amtrak.com/home), specifically the "Find trains" search form on the homepage. Scope stops at the FIND TRAINS button click - the search results page and the booking flow are out of scope.

## Tools and Techniques

Tests are written in Playwright for Node.js and TypeScript. This was chosen for its popularity in the testing domain and relatively painless setup process. I also follow the industry-standard [Page Object Model](https://playwright.dev/docs/pom) (POM), which helps with abstracting and simplifying interactions with the search form and its inputs.

"Arrange, act, assert" or "given, when, then" are good mnemonic templates for structuring individual test cases within each spec. Each test within a spec file should verify a single UI action, or at most a few related actions, similar to a unit test. Whenever possible and feasible, the Single Responsibility Principle should be followed, along with linting and code style enforcement. [Remember](https://martinfowler.com/articles/practical-test-pyramid.html), **test code is as important as production code.**

### On Locators

From most to least preferable (in my opinion), Playwright can locate UI elements via accessibility role and name, Test ID, label, CSS selectors, or visible text. I avoid the use of XPath or HTML tag names, and use any other HTML attribute with caution.

This site in particular makes an unusually strong case for role-based locators. By my analysis, `amtrak.com/home` hosts several independently bootstrapped Angular custom elements (`amt-md-farefinder`, `am-find-trip`, `train-schedule`, `book-now`, etc.). Many render their own station and date inputs, so the DOM contains multiple "From" fields, multiple date fields, and **two** FIND TRAINS buttons, both carrying the same `amt-auto-test-id="fare-finder-findtrains-button"`.

That has a direct consequence:

- `getByRole('button', { name: 'FIND TRAINS' })` resolves to **one** element, because the role engine excludes hidden nodes.
- The test ID resolves to **two**, and throws a strict-mode violation.

Amtrak does ship automation hooks, but they aren't always unique, and the accessibility tree is the more reliable index. The page object scopes everything to the `amt-md-farefinder` parent element for the same reason.

This is not a hard rule, though: for example, the station inputs expose `role="combobox"` **only while empty**. Once a suggestion is accepted the role is dropped, `getByRole` stops matching the field that was just filled, and no assertion can be made against it using that strategy. Those two locators _do_ use the wrapper's automation id, which survives that transition. Playwright's [`testIdAttribute`](https://playwright.dev/docs/locators#locate-by-test-id) is pointed at Amtrak's `amt-auto-test-id` in the config, so those two locators use `getByTestId(...)` instead of CSS attribute selectors.

## Test Coverage

Exhaustive coverage of the form is unrealistic within the time budget, so I focused on the behavior that carries the most information: the form's own validation gate.

The submit button ships disabled and enables only once origin, destination, and departure date are all satisfied. That transition is the application's verdict on whether the form is valid, it's observable without leaving the page, and it sits exactly on the scope boundary, which makes it a better assertion target than anything downstream.

`npx playwright test --list` prints the full picture: what is covered, and what is declared with `test.fixme` but not yet written. The planned items sit in the same `describe` block as the tests they relate to, so each area shows its own gaps.

### What the page object covers

The page object models the form's primary controls and nothing else:

| Covered                    | Not covered                    |
| -------------------------- | ------------------------------ |
| From / To stations         | Use Points toggle              |
| Trip Type                  | Disability Assistance checkbox |
| Depart Date / Return Date  | Add Coupon                     |
| Number of Travelers (read) | Multi-City trips               |
| Swap stations              | Advanced Search                |
| FIND TRAINS (submit)       | The pop-up calendar picker     |

The exclusions are scope decisions rather than oversights, and each is a straightforward addition to the page object: another locator and, for the toggles, a method.

The travelers control is only half covered, which the table above marks as "read". The page object can read the count off the button, and the initial-state test asserts it starts at one, but nothing opens the panel or changes a value. That is the largest untested part of the form: five passenger types (adult, senior, youth, child, infants) with increment and decrement controls each, a Reset, a cap of nine, and an unaccompanied-minor prompt under Youth. It is also the cheapest area to cover, since every control has an automation id and a clear accessible name, and none of it depends on the station autocomplete.

**The calendar picker is untested.** Clicking either date control opens a modal date picker with 84 `gridcell` elements, and this suite never touches it - dates are typed into the field and the picker is dismissed with Escape. Typing is the faster and more deterministic path, and it is what the field's own `MM/DD/YYYY` placeholder invites, but it means the widget most users actually click is unexercised. It is well suited to testing, since the day cells expose a `gridcell` role, and I would cover month navigation, selecting a date, and the disabling of days before departure on a round trip.

## Assumptions

- The suite runs against production `amtrak.com`. There is no staging environment available, so `BASE_URL` is configurable more as a matter of form than because a second environment exists.
- Testing is strictly black-box.
- Station reference data covers only the three stations the suite uses, verified by hand against the live autocomplete. Adding more is a one-line change in [`data/stations.ts`](./data/stations.ts).

## Known limitations

#### Post-click behavior is unverified

Clicking FIND TRAINS with a valid search does not change the URL. The results page is out of scope, so the suite asserts only that the button becomes enabled and is clickable. Asserting on the outcome would mean investigating behavior the brief puts outside the boundary.

#### Date input fields can't use typical interactions

Both date inputs need `click({ force: true })` before typing. A floating `<label>` sits over them and intercepts pointer events, so an ordinary click retries until it times out. Additionally, `fill()` works perfectly on the station fields, but not on the departure and return date inputs - the text appears in the box, the component never acts on it, and FIND TRAINS stays disabled with every field appearing populated. Only real keystrokes work.

It is not a rate problem: a debounce or throttle coalesces a burst and then acts on the final value; here the field sits unparsed indefinitely, so the input was never acted on rather than dropped for arriving too quickly. Typing with zero delay works too, so there is no speed ceiling being crossed. It is not a readiness problem either: waiting up to 20 seconds after page load before calling `fill()` had no effect. Instead, the component appears to require per-character text insertion.

#### Parallelism is capped at two workers locally, and one on CI

The autocomplete dropdown becomes flaky beyond these values. The failure is always the same: `locator.click` times out waiting for an option that is present and visible but never _stable_, which is one of the conditions Playwright checks before clicking.

Amtrak doesn't seem to be throttling concurrent automated access, as I was able to directly call the station endpoint with a large number of concurrent requests without issue. What degrades is only within the browser - my best guess is that the dropdown is animated, and running several instances of the page competes for CPU until it no longer settles inside the timeout.

This appears to be a consequence of running heavyweight browsers side by side, not of the site itself. The cap is set explicitly because the default is what produced the failures locally; a machine with more headroom might tolerate more. CI drops to a single worker because GitHub runners' resources are even more restricted.

#### Only Chromium gates CI

Push and pull request runs execute Chromium alone. Over 14 runs, it's the only browser that's never needed a retry; Firefox reports one or two flaky tests each time, and WebKit has failed outright more than once. Given more time, I would want to actually investigate and debug why the other two browsers are consistently flaky. For now, documenting Chromium as the only fully-supported browser is sufficient.

## Potential Improvements

### Test user actions _once_

If applicable and useful, I would implement action-based testing that bypasses the UI whenever appropriate, using Playwright's [request fixture](https://playwright.dev/docs/api-testing#writing-tests). This helps maintain a good balance between [DRY and DAMP](https://stackoverflow.com/a/11837973) code, and would avoid slowdown and bloat caused by performing identical UI actions across multiple tests. Note that in cases where authentication is required, Playwright tests support loading [shared auth states](https://playwright.dev/docs/auth) via cookies and browser storage.

### Accessibility assertions

The form is a natural fit for [`@axe-core/playwright`](https://playwright.dev/docs/accessibility-testing). I'd also flag something I noticed while working out locators: one of the station inputs carries `aria-label="To staion"`, a typo in Amtrak's own markup. That's the class of defect an accessibility-first locator strategy surfaces for free, and a good illustration of why role-based locators are worth the effort. They fail when the accessible name breaks, which is a real user-facing bug.

### Behavior-driven development (BDD)

If the audience and/or stakeholders for these tests included non-technical team members, integrating with a BDD framework (e.g., [Playwright-BDD](https://vitalets.github.io/playwright-bdd/#/)) might be worthwhile. This would enable collaboration in plain text instead of code, increasing alignment and shared understanding despite differences in skillset. In addition, it would combine all the benefits of Playwright with the best parts of BDD tools like Cucumber, including full support for the Gherkin language.

## How this scales

There is one spec file today, organized with `describe` blocks, which is proportionate to a single form. At a larger scale I'd split by **feature area**: `stations`, `dates`, `passengers`, each file owning its own happy path, validation, and edge cases. Splitting by test _category_ ("validation.spec.ts") looks organized and doesn't survive growth. It becomes a junk drawer, and finding everything about date handling means reading three files.

### Growing beyond a single page

The `findTrains` fixture assumes every test wants the Find Trains form and navigates there before the body runs. That is right for a suite scoped to one form - but if the suite scaled, I would change the following:

A `BasePage` would hold what every page shares: a path, a `goto()` that navigates and then waits for a readiness signal, and the cookie banner handling. Subclasses supply their own path and their own readiness check, because "the page is usable" means something different for each one.

The cookie banner would move again at that point. It is session state rather than page state, so it belongs either in an `auto` fixture that runs once per test regardless of which pages are involved, or better, in a `storageState` seeded with the consent cookie so the banner never renders at all. It currently sits in the one fixture that exists, which is the smallest correct place for it.

### CI sharding

The [sharding docs](https://playwright.dev/docs/test-sharding) show a matrix over `shardIndex` / `shardTotal`, and no browser-per-job example. Sharding splits one browser's tests across machines for speed, which is unnecessary for a suite of the current scope. The browser matrix instead serves the separate recommendation to [test across all browsers](https://playwright.dev/docs/best-practices), giving each engine its own job and its own report when a manual run selects all three. The structural details follow the sharding example: `fail-fast: false`, and an artifact name keyed on the matrix value so the jobs do not collide when uploading.
