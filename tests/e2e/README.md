# End-to-end tests

Playwright specs that check the plugin's dataLayer events against a real
WordPress + WooCommerce install, asserting the exact payload GTM receives.

## Running

Needs Docker and Node 22.

```sh
npm ci
npx playwright install chromium
npm run env:e2e:start   # WordPress + WooCommerce on http://localhost:8889
npm run test:e2e        # or test:e2e:ui / test:e2e:debug
npm run lint:e2e        # the spec rules a machine can check
```

`npm run env:e2e:destroy && npm run env:e2e:start` gets you a clean store.

After switching to a branch that doesn't have `test-plugins/` (or back),
restart the store with `npm run env:e2e:stop && npm run env:e2e:start`:
Docker keeps the old, deleted folder mounted, and the preflight reports the
e2e helper plugin as not active.

`WP_BASE_URL` points the suite at another site. That site needs what
`bin/wp-env-configure.sh` sets up, and specs that use `storeOptions()` need
the helper plugin from `test-plugins/`, which works only on a site whose
environment type is `local` (as wp-env's is). Don't install it on a shared
staging or QA site to get around that; the preflight says what is missing.

### Two environments

| Config             | URL                     | Scripts        | For                         |
|--------------------|-------------------------|----------------|-----------------------------|
| `.wp-env.json`     | `http://localhost:8888` | `env:*`        | Manual poking               |
| `.wp-env.e2e.json` | `http://localhost:8889` | `env:e2e:*`    | This suite (locally and CI) |

They are separate WordPress installs, so settings changed by hand in the dev
site's wp-admin never leak into test runs. Both are configured on start by
`bin/wp-env-configure.sh` (admin / password).

### Pinned versions

Both configs pin WordPress, WooCommerce and the Twenty Twenty-Five theme, so a
PR can't go red because one of them shipped a release. CI's scheduled run
(`.github/workflows/ci.yml`) tests against the latest releases every night.
When it fails, either fix the regression or bump the pins in both configs.

To try the latest releases locally, create `.wp-env.e2e.override.json` with
the same content that workflow writes, then `npm run env:e2e:start -- --update`.

## Layout

| Path                         | What                                                                 |
|------------------------------|----------------------------------------------------------------------|
| `specs/`                     | One file per Testomat suite (see Writing specs)                      |
| `fixtures/`                  | The `test` specs import: page objects, `dataLayer`, per-test catalog, `storeOptions()` |
| `fixtures/store-options.ts`  | The settings `storeOptions()` may override (see Store settings)      |
| `pages/`                     | Page objects                                                         |
| `data-layer/data-layer.ts`   | `DataLayer`: event name resolution, matching, `expectPushedOnce()`   |
| `data-layer/expected.ts`     | Builders for expected payloads                                       |
| `data-layer/types.ts`        | The payload shape                                                    |
| `api/`                       | Test content: REST setup/teardown, and generated data (`guestBuyer`) |
| `setup/preflight.setup.ts`   | Runs before every run: checks the store, purges leftovers            |
| `test-plugins/`              | Test-only WordPress plugins, loaded by `.wp-env.e2e.json` only       |

## Writing specs

`npm run lint:e2e` checks the rules marked (lint); CI runs it on every push.
The rest is up to the author and the review.

### The case and these rules

- **The Testomat case is the contract.** The rules below say how to write a
  spec, never what it checks: they don't change a case's setup, page or
  values, and they don't drop a line of its Expected result.
- **A mismatch is a question, not a decision.** Where a rule and the case
  pull apart, the plan names it, gives the options with a recommendation,
  and waits for an answer. The usual ones:
  - a field the case lists under "Not covered here", which comparing the
    whole event would assert anyway (`index` in the classic-grid case);
  - a setup the generated test data changes (the case's product has no
    category, the spec's has one, so `item_category` differs);
  - a case on a page every test shares (shop, search, home), where the spec
    has to find its own product;
  - a case checking that something is *not* pushed, which passes on a page
    that never loaded unless the spec first shows the page did its work.
- **The rules are defaults.** When another way would cover a case better,
  propose it in the plan, with why. Once agreed, a choice that applies beyond
  that case goes into this README in the same pull request, so it is asked
  only once.

### Files and tests

- **One spec file per Testomat suite**, named after the suite: `view_item` →
  `view-item.spec.ts`, `add_to_cart - AJAX click` →
  `add-to-cart-ajax-click.spec.ts`.
- **One `test()` per Testomat case**, in the suite's order. Its title is the
  case title followed by ` @T<case id>` (lint). See Testomat below.
- **No `test.describe` by default**: the file already groups the suite. Use
  one only when it does something, such as `test.use()` or a lock shared by
  its tests.
- **No `test.step`** (lint). A test is one case, read top to bottom.
- **Tests are independent.** No serial mode, no state shared between tests,
  no order they rely on.
- **Specs import `test` and `expect` from `../fixtures`** (lint), never from
  `@playwright/test` directly.

### Locators

- **Specs never touch `page`** (lint). Navigation and interaction go through
  a page object, even a one-line one, so the next spec has somewhere to add to
  and theme-specific markup stays in one place. Locators live only in
  `pages/`; the preflight, which runs on the base test, is the one exception.
- **Priority:** `getByRole()` with a name, then `getByLabel()` for form
  fields, then `getByText()`. CSS only for a stable WooCommerce core hook
  (`form.cart`), with an `eslint-disable-next-line <rule> -- <why>` comment
  (lint: the CSS needs the comment, and the comment needs the reason).
  No XPath, no theme classes (`.wp-block-…`), no `nth()` / `first()` (lint),
  unless the position is what the case checks.
- **Narrow by container:** the product card by its name, then the button in
  it. Never the first "Add to cart" on the page.

### Waiting

- **No fixed waits** (`waitForTimeout`, lint). The one exception is inside
  `DataLayer.expectPushedOnce()`, which waits out a duplicate push that must
  not come.
- Wait for a dataLayer event (`expectPushedOnce()`), a response
  (`waitForResponse()`) or a visible state (`expect( locator ).toBeVisible()`).
- **A page object action waits for its own result** (`ProductPage.addToCart()`
  waits for WooCommerce's notice), so a spec never has to know how long it
  takes. The exception is an action whose result is the dataLayer event the
  spec waits for anyway: `CategoryPage.addToCart()` only clicks, since the
  grid's cart request differs by theme and the event is what the case checks.

### Assertions

- **Wait with `dataLayer.expectPushedOnce()`.** It fails on a missing event,
  on a duplicate one and on one that isn't preceded by `{ ecommerce: null }`.
  Every event the plugin pushes (PHP and JS, including login, register and
  home) clears `ecommerce` first, so the check has no opt-out.
- **Assert the whole event with `toEqual`**, built from `data-layer/expected.ts`.
  A field the plugin starts or stops sending has to fail. Spell out `event`
  (`'add_to_cart_stape'`) instead of resolving it, so a dropped suffix fails too.
- **A case about one field asserts that field only** (`user_data`,
  `cart_state`): the rest of the event belongs to the cases about the event,
  so one defect fails a few cases, not every case that reads the event.
- **Builders map fixture data and nothing more.** What the plugin computes
  (`index`, `quantity`, a discounted `value`) is passed in by the spec, so a
  builder can never share a bug with the code it checks.
- **Every Expected result line of the case has an assertion.** A line the
  spec can't check leaves the case manual.
- **`cart_state` is not asserted in the event specs.** It has its own Testomat
  cases (Data layer - cart_state), and each event case lists it under "Not
  covered here". Specs pass the event through `withoutCartState()` and compare
  the rest with `toEqual`. Its spec will use `expectedCartState()`.
- **Specs fail on JS errors from the plugin** (the automatic `pageErrors`
  fixture): an uncaught error or a `console.error` raised by one of its files
  under `/plugins/<plugin folder>/` or by an inline script it prints, and a
  failed request to the plugin (its assets, or the `cart_state` call to
  admin-ajax). Errors from WooCommerce, the theme and other plugins are
  ignored, as are requests cancelled by a navigation: they change with every
  release, and `SCRIPT_DEBUG` makes React log warnings through `console.error`.
  The preflight check uses the base test and skips this fixture.

### Where new code goes

Extend the layers that exist; don't add new ones (no `utils/` or `helpers/`,
no helper functions inside spec files):

| Adding                                                   | Goes to                                   |
|----------------------------------------------------------|-------------------------------------------|
| Creating content over REST (products, coupons, users)    | `api/`                                    |
| Generating test data that isn't stored (a guest buyer)   | `api/`, with a fixture to hand it out     |
| A page, or a part of one                                 | `pages/`, one class per page              |
| An expected payload                                      | `data-layer/expected.ts`                  |
| Wiring into tests, with clean-up                         | `fixtures/index.ts`                       |
| A setting to override per test                           | `fixtures/store-options.ts` (see below)   |

A change to the core - `DataLayer`, the `pageErrors` and `storeOptions`
fixtures, the helper plugin, `playwright.config.ts`, the preflight - is a
decision of its own: name it in the plan before making it.

### Test data

- **Test content comes from fixtures.** Every test gets its own category and
  product (`category`, `product`) over REST, deleted afterwards, which only a
  fixture's teardown guarantees. A listing page is that category's archive, so
  it shows only what the test created.
- **Names are generated** (`E2E …` plus a unique suffix), and so are emails
  (`guestBuyer`). Don't reuse the names from the case text (`Cap Mug`) or
  hard-code IDs.
- **A new kind of product is an option of `api/products.ts`** plus a fixture,
  not a new function per case.
- **Environment state lives in `bin/wp-env-configure.sh`.** When a spec starts
  depending on a setting, add a check for it to the preflight. A spec that
  needs a different setting doesn't change it there: see Store settings.

### Style

- Format like the files around it (WordPress style: spaces inside
  parentheses, tabs).
- Comments say why, not what: why `ecomm_pagetype` is `product` on a category
  page, not that the line checks `ecomm_pagetype`.

## Store settings

Specs run in parallel on one WordPress site, and its options are site-wide: a
spec that writes one changes it for every spec running at the same time. Each
spec belongs to one of three groups. Take the first that fits, and say why
when it is not the first.

1. **Parallel** (the default). The spec creates its own content through
   fixtures. If it needs a setting other than the baseline, it overrides it
   for its own browser with `storeOptions()`, before the first page load:

   ```ts
   await storeOptions( { userData: 'yes' } );
   ```

   The fixture sets a cookie, and the helper plugin in
   `test-plugins/gtm-server-side-e2e-helper/` answers `get_option()` from it
   for that browser's requests. The database is never written, so nothing
   needs restoring and other specs never see the change. The helper works
   only on a `local` environment and only for the options in its own list,
   since anyone can set a cookie.

   It overrides reads only, and only for requests the browser makes. To add a
   setting, add it to `STORE_OPTIONS` in `fixtures/store-options.ts` and to
   the helper's `GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS`, after checking that:
   - nothing hooks the option being saved (`update_option_<name>`); the sGTM
     URL, container ID, Cookie Keeper and same-origin settings do, since saving
     them rebuilds the custom loader;
   - the code under test reads it during a browser request, not in cron, a
     webhook or a REST call made by `requestUtils`.

   Otherwise the spec belongs to group 2 or 3.
2. **Lock.** The spec writes an option to the database that only specs
   holding the same lock read. Give all of them the same Playwright test
   lock (`{ lock: '<name>' }`, from one shared list of lock names), and
   restore the option in the fixture's teardown. No spec needs this yet.
3. **Serial.** The spec writes something every spec reads: a setting saved
   through wp-admin, an option with an `update_option_<name>` hook, cron.
   It runs in a `serial` project with `workers: 1`, started as its own CI
   step after the parallel one and reporting into the same Testomat run.
   Not through `dependencies`: Playwright skips a dependent project when any
   test it depends on fails. Not set up yet; the first spec that needs it
   adds the project and the CI step.

## Testomat

Each test automates one Testomat test case: the test title is the case title,
followed by the case ID as a tag (`... @Ta58bd16c`). One test per case.

In CI the run is reported to Testomat (`@testomatio/reporter`, wired up in
`playwright.config.ts`) and every result is attached to its case by that tag.
The reporter needs the `TESTOMATIO` secret and is left out when it is missing,
so forks and local runs are unaffected. Tests without a tag, such as the
preflight check, are still sent, as unmatched tests.

Two limits of the Testomat run to keep in mind:

- A CI run cancelled by a newer push (`cancel-in-progress`) never closes its
  Testomat run, which stays in "running" with whatever it reported. The next
  push starts a fresh run.
- With `retries: 1` a retried test keeps one result per case in Testomat, the
  last attempt. A test that failed and then passed shows as passed there, and
  as flaky only in the GitHub report. Retries run at the end of the run, one
  at a time (`retryStrategy: 'isolated'`).

To automate a case: copy its title from Testomat and append `@T<id>`. The
case turns `automated` in Testomat by itself once a CI run reports it. A case
counts as automated only when the spec asserts every line of its Expected
result. Cases tagged `known-defect` are not automated for now.

## Known gaps

- Only the block grid is automated. There, "Add to cart" goes through
  `wc/store/v1/batch`, which jQuery's `ajaxComplete` never sees, so
  `add-to-cart-ajax-click.spec.ts` exercises only the 1500 ms fallback in
  `_pushWithStateCartData()`. The classic path (`wc-ajax=add_to_cart`, the
  classic cart) doesn't need another theme: its Testomat cases use a page with
  the `[products]` or `[woocommerce_cart]` shortcode in the same block theme,
  which a test can create like any other content.

## WebStorm

The gutter run button doesn't recognise these specs as Playwright tests: its
detector wants `test` imported straight from `@playwright/test`, and specs
import the extended one from `fixtures/`
([WEB-75027](https://youtrack.jetbrains.com/issue/WEB-75027)). Run them from a
Playwright run configuration instead.
