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
```

`npm run env:e2e:destroy && npm run env:e2e:start` gets you a clean store.
`WP_BASE_URL` points the suite at another site.

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

| Path                        | What                                                                 |
|-----------------------------|----------------------------------------------------------------------|
| `specs/`                    | One file per event, written as a shopper scenario                    |
| `fixtures/`                 | The `test` specs import: page objects, `dataLayer`, per-test catalog |
| `pages/`                    | Page objects                                                         |
| `data-layer/data-layer.ts`  | `DataLayer`: event name resolution, matching, `expectPushedOnce()`   |
| `data-layer/expected.ts`    | Builders for expected payloads                                       |
| `data-layer/types.ts`       | The payload shape                                                    |
| `api/`                      | REST setup/teardown of test content                                  |
| `setup/preflight.setup.ts`  | Runs before every run: checks the store, purges leftovers            |

## Conventions

- **Specs never touch `page`.** Navigation and interaction go through a page
  object, even a one-line one, so the next spec has somewhere to add to and
  theme-specific markup stays in one place.
- **Test content comes from fixtures.** Every test gets its own category and
  product (`category`, `product`) over REST, deleted afterwards. A listing page
  is that category's archive, so it shows only what the test created.
- **Assert the whole event with `toEqual`**, built from `data-layer/expected.ts`.
  A field the plugin starts or stops sending has to fail. Spell out `event`
  (`'add_to_cart_stape'`) instead of resolving it, so a dropped suffix fails too.
- **`cart_state` is not asserted in the event specs.** It has its own Testomat
  cases (Data layer - cart_state), and each event case lists it under "Not
  covered here". Specs pass the event through `withoutCartState()` and compare
  the rest with `toEqual`. Its spec will use `expectedCartState()`.
- **Wait with `dataLayer.expectPushedOnce()`.** It fails on a missing event,
  on a duplicate one and on one that isn't preceded by `{ ecommerce: null }`.
  Every event the plugin pushes (PHP and JS, including login, register and
  home) clears `ecommerce` first, so the check has no opt-out.
- **Specs fail on uncaught JS errors and `console.error`** (the automatic
  `pageErrors` fixture). A failed load counts only when it is a request to the
  plugin (its assets, or the `cart_state` call to admin-ajax); requests
  cancelled by a navigation and the store's own failed loads are ignored.
- **Environment state lives in `bin/wp-env-configure.sh`.** When a spec starts
  depending on a setting, add a check for it to the preflight.

## Testomat

Each spec automates one Testomat test case: the test title is the case title,
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
  as flaky only in the GitHub report.

To automate a case: copy its title from Testomat, append `@T<id>`, and switch
the case to `automated` there once its first CI run is reported.

## Known gaps

- Only the block theme is covered. There, "Add to cart" goes through
  `wc/store/v1/batch`, which jQuery's `ajaxComplete` never sees, so the
  `add_to_cart` spec exercises only the 1500 ms fallback in
  `_pushWithStateCartData()`. The classic-theme path (`wc-ajax=add_to_cart`)
  needs a second Playwright project running a classic theme such as Storefront.

## WebStorm

The gutter run button doesn't recognise these specs as Playwright tests: its
detector wants `test` imported straight from `@playwright/test`, and specs
import the extended one from `fixtures/`
([WEB-75027](https://youtrack.jetbrains.com/issue/WEB-75027)). Run them from a
Playwright run configuration instead.
