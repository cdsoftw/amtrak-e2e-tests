# Amtrak - E2E Tests

## [Cole Dapprich](https://www.linkedin.com/in/cdsoft/)

This repository contains an end-to-end test suite for the **"Find trains"** search form on the [Amtrak homepage](https://www.amtrak.com/home), written in Playwright for Node.js and TypeScript. Scope is deliberately narrowed to the form and its inputs, up to and including the `FIND TRAINS` button click; limited to a ~4-5 hour timespan.

### [Testing Approach](./APPROACH.md)

---

### Project structure

```text
pages/       page object for the Find trains form
fixtures/    the `findTrains` test fixture
data/        station reference data and the search-criteria factory
tests/       specs
```

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
npx playwright test tests/find-trains-form.spec.ts --project=chromium
npx playwright test -g "round trip"
```

The suite runs against production `amtrak.com`. No credentials, environment variables, or local services are required. To point it somewhere else, set `BASE_URL`.

### A note on parallelism

The suite caps `workers` at 2 locally, and 1 on CI. See [APPROACH.md](./APPROACH.md#parallelism-is-capped-at-two-workers-locally-and-one-on-ci) for more info.

### Checks

```shell
npm run verify        # typecheck + lint + format, the same gate CI runs
npm run lint          # eslint, including type-aware rules and playwright rules for specs
npm run format        # prettier --write
```

### Continuous Integration

Two workflows run on both push and pull request: [`verify.yml`](./.github/workflows/verify.yml) runs `npm run verify`, and [`playwright.yml`](./.github/workflows/playwright.yml) runs the Chromium suite (See: [APPROACH.md](./APPROACH.md#only-chromium-gates-ci)). Firefox and WebKit sit behind that workflow's manual trigger, which takes a browser as an input; picking `all` tests the three browsers as a matrix. The HTML report is uploaded as an artifact from each job.

---

### Tooling

- Playwright 1.62.1
- Node 24 LTS
- TypeScript
- Prettier 3.9.6
- ESLint 10
  - `typescript-eslint` type-aware rules
  - `eslint-plugin-playwright`
