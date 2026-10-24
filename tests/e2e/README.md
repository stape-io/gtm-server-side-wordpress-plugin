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

After switching to a branch that doesn't have `mu-plugins/` (or back),
restart the store with `npm run env:e2e:stop && npm run env:e2e:start`:
Docker keeps the old, deleted folder mounted, and the preflight reports that
the e2e helper overrides no options.

`WP_BASE_URL` points the suite at another site. That site needs what
`bin/wp-env-configure.sh` sets up, and specs that use `storeOptions()` need
the helper from `mu-plugins/` as a must-use plugin, which works only on a site whose
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
| `specs/`                     | One folder per Testomat folder, one file per suite (see Writing specs) |
| `fixtures/`                  | The `test` specs import: page objects, `dataLayer`, per-test catalog, `storeOptions()` |
| `fixtures/store-options.ts`  | The settings `storeOptions()` may override (see Store settings)      |
| `pages/`                     | Page objects; the pages with a product grid share `ProductListing`   |
| `data-layer/data-layer.ts`   | `DataLayer`: event name resolution, matching, `expectPushedOnce()`   |
| `data-layer/expected.ts`     | Builders for expected payloads                                       |
| `data-layer/types.ts`        | The payload shape                                                    |
| `api/`                       | Test content: REST setup/teardown, and generated data (`guestBuyer`, `newCustomer`) |
| `setup/preflight.setup.ts`   | Runs before every run: checks the store, purges leftovers            |
| `mu-plugins/`                | Test-only WordPress plugins, must-use, in the e2e site only (see Test plugins) |

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
- **In a folder named after the suite's Testomat folder** under
  `CMS / WordPress`, the same way: `Data layer - ecommerce events / view_item`
  → `specs/data-layer-ecommerce-events/view-item.spec.ts`. Testomat matches
  results by the `@T` tag, not the path, so the folders are for people.
- **One `test()` per Testomat case**, in the suite's order. Its title is the
  case title followed by ` @T<case id>` (lint). See Testomat below.
- **No `test.describe` by default**: the file already groups the suite. Use
  one only when it does something, such as `test.use()` or a lock shared by
  its tests.
- **No `test.step`** (lint). A test is one case, read top to bottom.
- **Tests are independent.** No serial mode, no state shared between tests,
  no order they rely on.
- **Specs import `test` and `expect` from `tests/e2e/fixtures`** (lint),
  never from `@playwright/test` directly.

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
  `DataLayer`, which waits out a push that must not come: a duplicate after
  `expectPushedOnce()`, or any push before `expectNotPushed()`. When a case
  gives that wait itself ("wait 5 more seconds"), pass it as `quietMs`
  instead of the default.
- Wait for a dataLayer event (`expectPushedOnce()`), a response
  (`waitForResponse()`) or a visible state (`expect( locator ).toBeVisible()`).
- **A page object action waits for its own result** (`ProductPage.addToCart()`
  waits for WooCommerce's notice), so a spec never has to know how long it
  takes. The exception is an action whose result is the dataLayer event the
  spec waits for anyway: the grid pages' `ProductListing.addToCart()` only clicks, since the
  grid's cart request differs by theme and the event is what the case checks,
  and so does `ProductPage.clickAddToCart()`, whose result is what the
  dataLayer gets or must not get.

### Assertions

- **Wait with `dataLayer.expectPushedOnce()`.** It fails on a missing event,
  on a duplicate one and on one that isn't preceded by `{ ecommerce: null }`.
  Every event the plugin pushes (PHP and JS, including login, register and
  home) clears `ecommerce` first, so the check has no opt-out.
- **Assert the whole event with `toEqual`**, built from `data-layer/expected.ts`.
  A field the plugin starts or stops sending has to fail. Spell out `event`
  (`'add_to_cart_stape'`) instead of resolving it, so a dropped suffix fails too.
  An event with no fixture data to map (sign_up: `{ event: 'sign_up_stape' }`)
  is spelled out in the spec, with no builder.
- **A case checking that an event is *not* pushed** first shows the page did
  its work (its grid shows products, say), then calls
  `dataLayer.expectNotPushed()`, which also fails on a page without the
  plugin's script. It is for events printed into the page, which are in the
  dataLayer once the page has loaded; it doesn't wait for a JS push unless
  the case says how long to wait (`{ quietMs }`).
  An event printed in `wp_footer` on every page (sign_up) needs no other
  proof: `varGtmServerSide`, which the check requires, comes with the footer
  scripts after it, so the page's footer rendered whatever else it shows.
- **On a page every test shares** (shop, home), a test's own products may be
  on another page of it. The spec checks what holds whatever else is in the
  store (the grid shows products), and looks for its own products on pages
  only it creates (its category, tag or search keyword). A case that has to
  click its own product in the shop opens it newest first
  (`shopPage.goto( { orderby: 'date' } )`) with 100 products to a page
  (`storeOptions( { catalogColumns: '4', catalogRows: '25' } )`), so what the
  tests next to it create can't push the product off page 1.
- **A case about some fields asserts those fields only** (`user_data`,
  `cart_state`, which products a list holds and in what order): the rest of
  the event belongs to the cases about the whole event, so one defect fails a
  few cases, not every case that reads the event. It still spells out `event`
  when the case names it, and compares its items with
  `expect.objectContaining()` holding the fields the case lists.
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
- **PHP warnings in `debug.log`** are checked with the `phpErrors` fixture,
  not by reading the log, which every test running at the same time writes
  to: `await phpErrors.expectNone()` last, for a case that has the line. It
  counts the warnings, notices and fatal errors PHP reported on this test's
  browser requests only (`mu-plugins/record-php-errors.php`), from any
  plugin, as the log would show them.

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
| Code that has to run inside WordPress for a test         | `mu-plugins/` (see Test plugins)          |

A change to the core - `DataLayer`, the `pageErrors` and `storeOptions`
fixtures, the helper plugin, `playwright.config.ts`, the preflight - is a
decision of its own: name it in the plan before making it.

### Test data

- **Test content comes from fixtures.** Every test gets its own category and
  product (`category`, `product`) over REST, deleted afterwards, which only a
  fixture's teardown guarantees. A listing page is that category's archive, so
  it shows only what the test created.
- **Names are generated** (`E2E …` plus a unique suffix), and so are emails
  (`guestBuyer`, `newCustomer`). Don't reuse the names from the case text
  (`Cap Mug`) or hard-code IDs.
- **Names sort in the order they were created** within a test
  (`uniqueSuffix()`), so a case about title order creates its products in the
  order it expects them back.
- **A new kind of product is an option of `api/products.ts`**
  (`ProductOptions`), not a new function per case.
- **A shape many cases use gets a named fixture; the rest come from
  `catalog`.** `category`, `product` and `saleProduct` are named, since most
  cases need just those. Anything else - a variable or grouped product, a
  subcategory, a set of products - the test creates through
  `catalog.createCategory()` / `catalog.createProduct()`, which deletes it
  after the test, newest first. A shape earns a named fixture once cases in
  several suites need it (`saleProduct`: view_item, view_cart, begin_checkout,
  purchase), not for one case.
- **Coupons and tax rates are store-wide, so they come from `catalog` too.**
  A coupon gets a generated code (`catalog.createCoupon( '10' )`), which only
  the test applies. A tax rate goes into a tax class of its own
  (`catalog.createTaxRate( { country: 'US', rate: '25' } )`), and only the
  test's product uses that class (`{ tax_class: rate.taxClass }`), where the
  case says "standard rate": no other product, and no other test running at
  the same time, is ever taxed at it. Taxes are off on the baseline store; a
  case with tax turns them on for its own browser
  (`storeOptions( { calcTaxes: 'yes' } )`, plus `pricesIncludeTax`).
- **A product the case only needs in the cart goes there with
  `homePage.addToCart()`**, which requests the case's `?add-to-cart=` link
  with the test's cookies but renders no page. The rendered front page
  (`homePage.gotoAddingToCart()`) fetches the cart over the Store API, and an
  add that starts while that request is still saving the session can be lost.
  `gotoAddingToCart()` is for a case about the page the add lands on.
- **An order is placed by the browser, so `guestBuyer` cleans it up.** A case
  that places one checks out as `guestBuyer`
  (`checkoutPage.fillBillingDetails()`, then `placeOrder()`). REST never
  creates the order, so `catalog` doesn't know it: the `guestBuyer` fixture
  deletes every order with its email after the test, and the preflight
  deletes the guest orders killed runs left behind (`api/orders.ts`).
- **A case that places the order with curl** (no page rendered in between)
  places it from the test's browser instead: `homePage.addToCart()`, then
  `checkoutPage.placeOrderThroughStoreApi( guestBuyer )`, which posts to the
  Store API endpoint the Checkout block uses with the browser's cookies and
  returns the order's ID and order-received URL. The case's later curl
  requests are pages the browser opens, and its `grep -c` is
  `expectPushedOnce()` or `expectNotPushed()`.
- **An account the browser registers is deleted by the fixture whose email
  it has.** A case that registers on My Account gives `newCustomer.email` to
  `myAccountPage.register()`; one that creates an account at checkout ticks
  `checkoutPage.createAccount()` as `guestBuyer`. Both fixtures delete the
  account with their email after the test, and the preflight deletes the
  ones killed runs left behind (`purgeTestAccounts()`). Registration is off
  on the baseline store; the case turns it on for its own browser
  (`storeOptions( { myAccountRegistration: 'yes' } )` or `checkoutSignup`).
- **A new private window, or a deleted cookie jar, is `newSession()`**: the
  test's browser forgets its cookies, the `storeOptions()` and `testPlugins`
  ones included, so set those again after it.
- **What a case does as the store admin over WP-CLI** to its own content
  (a product's price, an order's status) goes through REST: `catalog.updateProduct()`,
  `orders.setStatus()`. A case in wp-admin logs the test's browser in with
  `loginAsAdmin()`; an order it creates there has no guest's email, so the
  spec hands its ID to `orders.deleteAfterTest()`.
- **Shipping is off for everyone but the test that asks.** The baseline store
  has no shipping method, and adding one to the database makes every cart
  need a shipping option: the checkouts of the tests next to it fail. A case
  with shipping gets a flat rate for its own browser,
  `testPlugins.flatRateShipping( '5.00' )` (not taxed). The checkout labels
  its line with the method's title, `Flat rate`.
- **Environment state lives in `bin/wp-env-configure.sh`.** When a spec starts
  depending on a setting, add a check for it to the preflight. A spec that
  needs a different setting doesn't change it there: see Store settings.
- **Same-origin is half set up in the database:** enable and path (`/metrics`),
  so the proxy's rewrite rule exists, but no API key, so no page changes and
  `/metrics` answers 404. A proxy spec supplies the key for its own requests
  with `storeOptions( { sameOriginApiKey } )`; a key ending in `:test` sends
  the proxy to `*.stape.test`, which `mu-plugins/stub-same-origin-upstream.php`
  answers with the URL it was sent.

### Test plugins

Code a test needs inside WordPress - overriding a setting, answering the
plugin's requests to Stape, recording what it sends - is a test plugin in
`mu-plugins/`.

- **One file per plugin**, at the top of the folder: WordPress loads
  must-use plugins only from there, not from subfolders.
- **Must-use, mapped into the e2e site only.** `.wp-env.e2e.json` maps the
  folder to `wp-content/mu-plugins`, so a test plugin loads on every request,
  before any regular plugin, can't be switched off, and isn't affected by the
  nightly run replacing the plugin list. `/tests` is export-ignored, so none
  of it ships.
- **Inert unless the test asks.** Every spec runs with every test plugin
  loaded, so a test plugin changes nothing on a request that doesn't carry its
  test's cookie or go to a test host (`*.stape.test`). One that changed the
  store for everyone would break the specs next to it.
- **Local only, when a visitor could trigger it.** Anyone can set a cookie,
  so a plugin that acts on one does so only where `wp_get_environment_type()`
  is `local`, and only for what it lists.
- **A test plugin a spec turns on** has a method on the `testPlugins`
  fixture, which sets its cookie: `flatRateShipping()`
  (`flat-rate-shipping.php`), `markOrderConfirmationPage()` for a shop's own
  thank-you page (`order-confirmation-page.php`, in place of a case's
  store-wide filter), and `endEmailVerificationGrace()`, for a guest order
  link opened more than 10 minutes later (`email-verification-grace.php`).
- **A third-party plugin under test** (GTM4WP, say) is installed through
  `plugins` in `.wp-env.e2e.json`, like WooCommerce, not here.

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

   The fixture sets a cookie, and the helper plugin
   `mu-plugins/gtm-server-side-e2e-helper.php` answers `get_option()` from it
   for that browser's requests. The database is never written, so nothing
   needs restoring and other specs never see the change. The helper works
   only on a `local` environment and only for the options in its own list,
   since anyone can set a cookie.

   It overrides reads only, and only for requests the browser makes. To add a
   setting, add it to `STORE_OPTIONS` in `fixtures/store-options.ts` and to
   the helper's `GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS`, after checking that:
   - what the test checks doesn't depend on what runs when the option is
     saved (`update_option_<name>` hooks), since an override never saves it.
     Saving the sGTM URL, container ID or Cookie Keeper rebuilds the custom
     loader, so a test of the loader can't override them. Saving same-origin
     enable or path writes the proxy path's rewrite rule, without which the
     proxy answers 404, so they can't be overridden either. Saving the
     same-origin API key only flushes the rewrite rules (and, in wp-admin,
     rebuilds the loader too), and the rule doesn't depend on the key, so a
     proxy test can override it;
   - the override doesn't put the pages in a state no live store has. The
     same-origin API key would: with it, every page switches to same-origin
     (service worker patch, identifier from the key, no Cookie Keeper) but
     keeps the raw sGTM URL, since the same-origin loader exists only after a
     real save. So the helper applies it to requests under the proxy path
     only, and any other page renders as without it. An option like that
     goes into the helper's `GTM_SERVER_SIDE_E2E_PROXY_PATH_ONLY_OPTIONS`, or a
     scope of its own;
   - the code under test reads it during a browser request, not in cron, a
     webhook or a REST call made by `requestUtils` (a request made through the
     test's browser context, `page.request`, carries the cookie).

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
so forks and local runs are unaffected. Tests without a tag are still sent,
as unmatched tests. The preflight check has a case of its own, `Environment` →
`Store is configured the way the specs assume`, so it shows up in a run by
name; it is not a product case, and a failure means the environment is off.

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
result. Cases tagged `known-defect` are not automated for now. The
`/automate-suite <suite>` skill (`.claude/skills/automate-suite/`) runs the
whole flow for one Testomat suite.

## Classic markup

The store runs a block theme. A case about WooCommerce's classic markup (the
`[products]` loop, which adds over `wc-ajax=add_to_cart`, or the
`[woocommerce_cart]` form) doesn't need another theme: the test creates a page
holding the shortcode, with `catalog.createClassicLoopPage( category )` for
the loop and `catalog.createClassicCartPage()` for the cart. The loop page's
`[products]` lists only the test's category, where the case's page lists the
whole store, so other tests can't move the product. The cart page stands in
for the case's shared "Classic cart page": the cart belongs to the test's
browser either way.

## WebStorm

The gutter run button doesn't recognise these specs as Playwright tests: its
detector wants `test` imported straight from `@playwright/test`, and specs
import the extended one from `fixtures/`
([WEB-75027](https://youtrack.jetbrains.com/issue/WEB-75027)). Run them from a
Playwright run configuration instead.
