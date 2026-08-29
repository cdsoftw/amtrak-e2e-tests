# Testing Approach

### Application Under Test (AUT):

[Amtrak - Home](https://www.amtrak.com/home), specifically the "Find trains" search form. Scope stops at the `FIND TRAINS` button click - the search results page and the booking flow are untested.

## Tools and Techniques

Tests are written in Playwright for Node.js and TypeScript. This was chosen for its popularity in the testing domain and relatively painless setup process.

"Arrange, act, assert" or "given, when, then" are good mnemonic templates for structuring individual test cases within each spec. Each test scenario should verify a single UI action, or at most a few related actions, similar to a unit test. Whenever applicable, the Single Responsibility Principle should be followed, along with linting and code style enforcement. [Remember](https://martinfowler.com/articles/practical-test-pyramid.html), **test code is as important as production code.**

### Design patterns

- **[Page Object Model](https://playwright.dev/docs/pom)** - [`pages/find-trains-form.page.ts`](./pages/find-trains-form.page.ts) owns every locator and every interaction with the form, so a UI change has exactly one place to land. Its methods synchronize but do not assert: a verdict on the application's behavior belongs to the calling spec.
- **Fixtures as dependency injection** - [`fixtures/test.ts`](./fixtures/test.ts) hands each test a `findTrains` page object that is already navigated and past the cookie banner. Tests declare what they need in their arguments rather than constructing it, which is what keeps setup out of the test bodies.
- **Test data factory** - [`makeSearch()`](./data/search-criteria.ts) returns a valid one-way search with any field overridable, so a test states only what needs to change from the defaults. `makeSearch({ origin: STATIONS.PHL, destination: STATIONS.PHL })` reads as "the same-station case" and nothing else, and relative dates ensure the data never rots.

A builder buys similar expressiveness at the cost of a chaining API, and would earn that cost once construction has ordering rules and/or interdependent fields. `SearchCriteria` has four fields and no such rules (other than One-Way not supporting a return date), so a factory is the proportionate choice. A builder might be more appropriate if we add `Multi-City` support, as that would require handling a search form that contains an indefinite number of trip legs.

### On Locators

Playwright can locate UI elements via a variety of methods. My personal order of preference (most to least) is: accessibility role + name, Test ID, accessible label, CSS selectors, or visible text. I avoid the use of XPath or tag names whenever possible, and only leverage other HTML attributes when necessary.

This site in particular makes a strong case for role-based locators. By my analysis, `amtrak.com/home` hosts several independently bootstrapped custom Angular elements. Many render their own station and date inputs, so the DOM contains multiple "From" fields, multiple date fields, and two `FIND TRAINS` buttons, both carrying the same `amt-auto-test-id="fare-finder-findtrains-button"`. Amtrak _does_ ship automation hooks, but they aren't always unique, so the accessibility tree is the more reliable index. The page object also scopes everything to the `fare-finder-cmp` parent element for the same reasons.

### A note on AI usage

All prose in this repository was written by me personally; test coverage decisions and spec design are my own. As an experiment, I tried the Playwright MCP/CLI early on, but ended up dropping it - making corrections was often slower than doing the work myself. In all, Agentic AI was only used for initial ideation, code review passes, and bug hunting/fixes; I thoroughly reviewed and verified the small percentage of code I did not directly author.

## Test Coverage

Exhaustive coverage of the form is unrealistic within the time budget, so I focused on the most critical-path behavior: the form's own validation gate. The submit button is disabled initially, and only enables once origin, destination, and departure date are all satisfied. That transition is the application's verdict on whether the form is valid, and it sits exactly on the scope boundary.

The spec is the home for all other coverage decisions: it uses `test` for what's covered, and `test.fixme` for what was planned but not written. Each run prints the latter with a `-` and counts them as skipped. The planned items sit in the same `describe` block as the tests they relate to, so each area shows its own gaps.

### What the page object covers

The page object handles the form's primary controls and nothing else. Exclusions are scope decisions rather than oversights, and each is a straightforward addition to the page object:

| Covered                         | Not covered                    |
| ------------------------------- | ------------------------------ |
| `From` / `To` stations          | Use Points toggle              |
| Trip Type                       | Disability Assistance checkbox |
| Depart Date / Return Date       | Add Coupon                     |
| Number of Travelers (read-only) | Multi-City trips               |
| Swap stations                   | Advanced Search                |
| `FIND TRAINS` (submit)          | The pop-up calendar picker     |

#### The `Travelers` control is partially covered

The page object can read the count off the button, and the initial-state test asserts it starts at `1`, but nothing opens the panel or changes a value. This is the largest untested part of the form: five passenger types (adult, senior, youth, child, infant) with increment and decrement controls on each, a Reset, a cap of `9`, and an unaccompanied-minor prompt under Youth. It is also the cheapest area to cover, since every control has an automation ID and a clear accessible name, and none of it depends on the station autocomplete results.

#### The date modal is untested

Clicking either date control opens a calendar widget / date picker with 84 `gridcell` elements. This suite never touches them - dates are typed into the field and the picker is dismissed with `Esc`. Typing is the faster and more deterministic path, and it is what the field's own `MM/DD/YYYY` placeholder invites, but results in the widget most customers actually use going unexercised. It is well suited to testing, since each day exposes a `gridcell` role; I would cover month navigation, selecting individual dates, and being unable to select past dates.

## Assumptions

- The suite runs against production `amtrak.com`. There is no known staging/dev environment, so `BASE_URL` is configurable more as a matter of form than the existence of multiple environments.
- The AUT will always be available and performant whenever our tests are run.
- Testing is strictly black-box. Testers have little to no knowledge of the form's internal workings.
- Station reference data only covers the three stations currently used in the suite, verified by hand against the live form. Adding more is a one-line change in [`data/stations.ts`](./data/stations.ts).
- Desktop support only - no mobile testing was performed, and it's assumed to be out of scope.

### Possible Amtrak defects

#### Post-submit behavior

Clicking `FIND TRAINS` with a valid search does not change the URL when under automation (possible bot detection?). The results page is out of scope, so the suite only asserts that the button becomes enabled and is clickable. Asserting on the outcome would require investigating behavior outside the assignment's boundary.

#### Date input fields can't use typical interactions

Date inputs need `click({ force: true })` before typing - a floating `<label>` sits over the center of both elements and intercepts pointer events, causing ordinary clicks to time out. Additionally, `fill()` works perfectly on the station input fields, but _doesn't work_ for departure/return date: the text appears in the box, but the component never acts on it, and `FIND TRAINS` stays disabled - even though every field appears populated. Only real keystrokes work, seemingly even with zero delay, so there is no speed ceiling being crossed. It's also not a readiness problem: waiting up to 20 seconds after page load before calling `fill()` had no effect. Instead, the component appears to require per-character text insertion.

### Known limitations

#### Parallelism is capped at two workers locally, and one on CI

The autocomplete dropdown becomes flaky beyond these values, with the same recurring failure: `locator.click` times out waiting for an option that is present and visible but never _stable_ (Playwright's final pre-click condition check). Amtrak doesn't seem to be throttling concurrent automated requests, as I was able to hit the station endpoint many times simulataneously without issue. What degrades is only inside the browser - my best guess is that the dropdown is animated, and running several instances of the page competes for CPU until it no longer settles within the timeout.

The cap is set explicitly because the default value produced failures locally; a machine with more headroom might tolerate a higher one. CI drops to a single worker because GitHub runners' resources are even more restricted.

#### Only Chromium gates CI

Push and pull request runs execute Chromium tests only. Over 15+ runs, it's the only browser that's never needed a retry; Firefox reports around one or two flaky tests each time, and WebKit has failed outright more than once. Given enough time, I would want to actually investigate and debug why the other two browsers are consistently flaky. For now, documenting Chromium as the only fully-supported browser is sufficient.

## Potential Improvements

### Test user actions _once_

Ideally, I would implement action-based testing that bypasses the UI whenever useful and appropriate, using Playwright's [request fixture](https://playwright.dev/docs/api-testing#writing-tests). This helps maintain a good balance between [DRY and DAMP](https://stackoverflow.com/a/11837973) code, and would avoid slowdown and bloat caused by performing identical UI actions across multiple tests. Note that in cases where authentication is required, Playwright tests support loading [shared auth states](https://playwright.dev/docs/auth) via cookies and browser storage.

### Accessibility assertions

The form is a natural fit for leveraging [`@axe-core/playwright`](https://playwright.dev/docs/accessibility-testing), adding coverage for an entirely new facet of the User Experience. For example, while working on locators, I noticed that one of the station inputs carries `aria-label="To staion"` - a typo in Amtrak's own markup. That's the class of defect an accessibility-first locator strategy surfaces for free, and a good illustration of why role-based locators are worth the effort. They fail when the accessible name breaks, which is a real user-facing bug.

### How this scales

There is one spec file today, organized with `describe` blocks, which is proportionate to a single form. At a larger scale I'd split by **feature area**: `stations`, `dates`, `passengers`, each file owning its own happy path, validation, and edge cases.

#### Growing beyond a single page

The `findTrains` fixture assumes every test wants the Find Trains form and navigates there before the body runs. This is correct for a suite scoped to one form; if the suite scaled, I would add a `BasePage` class that contains what each page shares: a path, a `goto()` method that navigates and waits for a readiness signal, and cookie banner handling. Subclasses supply their own path and their own readiness check, because "the page is usable" means something different for each one.

Also note that the cookie banner is session state rather than page state, so the best home for it is either a fixture that executes once per test run - or even better, a `storageState` seeded with the consent cookie so the banner never renders at all. It currently sits in the one fixture that exists, which is the smallest correct place for it.

#### CI sharding

The [sharding docs](https://playwright.dev/docs/test-sharding) show a matrix over `shardIndex` / `shardTotal`, and no browser-per-job example. Sharding splits one browser's tests across machines for speed, which is unnecessary for a suite with the current scope - but it could be added once multiple feature-scoped spec files exist.

For now, the browser matrix serves the separate recommendation to [test across all browsers](https://playwright.dev/docs/best-practices), giving each engine its own job/report whenever all three are selected in a manual run. The structural details follow the sharding example: `fail-fast: false` (so a WebKit-only failure does not cancel the other jobs), and an artifact name keyed on the matrix value so the jobs do not collide when uploading.
