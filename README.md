# Amtrak - E2E Tests

## [Cole Dapprich](https://www.linkedin.com/in/cdsoft/)

This repository contains an end-to-end test suite for the **"Find trains"** search form on the [Amtrak homepage](https://www.amtrak.com/home), written in Playwright for Node.js and TypeScript. Scope is deliberately narrowed to the form and its inputs, up to and including the FIND TRAINS button click; limited to a ~4-5 hour time limit.

### [Approach and Test Plan](./APPROACH.md)

---

### Requirements

Node.js 22 or 24 LTS (an [`.nvmrc`](./.nvmrc) is provided; `fnm use` or `nvm use` will pick it up). Install dependencies and browsers:

```shell
npm ci
npx playwright install chromium
```

`npx playwright install` (no argument) fetches Firefox and WebKit as well, which is only needed for `npm run test:all`.

### Running the tests

```shell
npm test              # chromium-only
npm run test:all      # chromium + firefox + webkit
npm run test:headed   # watch it drive the browser (chromium)
npm run test:ui       # Playwright's interactive UI mode
npm run test:debug    # step through with the inspector
npm run report        # open the HTML report from the last run
```

To run a single spec or a single test:

```shell
npx playwright test tests/find-trains.spec.ts
npx playwright test -g "round trip"
```

The suite runs against production `amtrak.com`. No credentials, environment variables, or local services are required. To point it somewhere else, set `BASE_URL`.

### Checks

```shell
npm run verify        # typecheck + lint + format, the same gate CI runs
npm run lint          # eslint, including type-aware rules and playwright rules
npm run format        # prettier --write
```

### Project structure

```text
pages/       page object for the Find trains form
fixtures/    the `findTrains` test fixture (navigated, past the cookie banner)
data/        station reference data and the search-criteria factory
tests/       specs
```

### A note on parallelism

The suite caps `workers` at 2 locally, and 1 on CI. The station suggestion dropdown animates, and once several browsers are rendering this page at once it stops settling in time for Playwright to click it. I measured this myself - with retries disabled, 20/20 executions pass at 2 workers, while Playwright's default of 8 fails and is slower doing it. See [APPROACH.md](./APPROACH.md#known-limitations).

### Continuous integration

[`.github/workflows/playwright.yml`](./.github/workflows/playwright.yml) runs the suite on push and pull request as a three-job matrix, one per browser, with `fail-fast` disabled so a WebKit-only failure does not cancel the Chromium and Firefox runs. The HTML report is uploaded as an artifact from each job.

---

### Tooling and process

Playwright + TypeScript, with Prettier + ESLint 9 with `typescript-eslint` type-aware rules and `eslint-plugin-playwright`. As an experiment, I initally made some use of the Playwright MCP and/or CLI + skills, but found their results a tad lackluster for a greenfield project like this. In all, I leveraged Agentic AI only for a basic initial ideating process, as well code reviews / bug-finding. I designed/chose the test cases myself, and all prose + source code in this repository was written, verified, and ran by me personally.
