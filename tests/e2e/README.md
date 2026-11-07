# End-to-end tests

Playwright specs that check the plugin's dataLayer events against a real
WordPress + WooCommerce install, asserting the exact payload GTM receives.

## Running

Needs Docker and Node 22.

```sh
npm ci
npx playwright install chromium
npm run env:e2e:start
npm run test:e2e
npm run lint:e2e
```

`env:e2e:start` starts WordPress + WooCommerce on http://localhost:8889,
`test:e2e` runs every spec (plain `playwright test`: pass a file or `--grep`
after `--`), and `lint:e2e` checks the spec rules a machine can check. The
block has no comments on purpose: WebStorm runs a line of it without a
shell, so a `# comment` would reach the command as arguments.

Serial tests run in the same run, one at a time, while no other test runs
(see Store settings). Only one run may use the store at a time: a second
run's preflight deletes the test content the first one is using.

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
| `fixtures/serial.ts`         | `SERIAL`, the details of a serial test (see Store settings)          |
| `pages/`                     | Page objects; the pages with a product grid share `ProductListing`   |
| `data-layer/data-layer.ts`   | `DataLayer`: event name resolution, matching, `expectPushedOnce()`   |
| `data-layer/expected.ts`     | Builders for expected payloads                                       |
| `data-layer/types.ts`        | The payload shape                                                    |
| `data-layer/gtm-snippet.ts`  | What the GTM snippet specs look for in a page's source (sGTM URL, snippet markers) |
| `api/`                       | Test content: REST setup/teardown, and generated data (`guestBuyer`, `newCustomer`); clients of the test plugins' REST routes (site state, loader cache, recorded requests) |
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
- **Tests are independent.** No `test.describe.configure( { mode: 'serial' } )`,
  no state shared between tests, no order they rely on. (A serial test, in
  Store settings, is another thing: it runs while no other test runs, and is
  still independent.) The nightly CI run checks this: it starts the tests in
  a random order (`--shuffle`). Its log prints `shuffle seed N`, and
  `npm run test:e2e -- --shuffle N` starts them in that order again. With
  more than one worker, which tests end up running side by side can still
  differ; `--workers=1` replays the order exactly.
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
- **The plugin's own settings fields in wp-admin** have no accessible name
  (no `<label>`, and WordPress's settings table has role=presentation), so
  `AdminSettingsPage` finds them by their id, the option they save, which the
  plugin's admin script uses too. A switch whose checkbox hides under it
  (the same-origin proxy's) is clicked where the user clicks it, its label:
  `label[for="<option id>"]`. The same goes for what the plugin's admin
  script shows next to them: a block it shows and hides is found by its
  `js-` class, and a validation message by jQuery Validate's
  `label.error[for="<option id>"]`, where the script places it
  (`validationError()`).
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
- **An entry pushed without an event** (home's `{ ecomm_pagetype: 'home' }`)
  is selected by its page type: `dataLayer.expectPushedOnce( { ecomm_pagetype:
  'home' } )`, and the same for `expectNotPushed()`. The checks are the same
  as for an event. It matches every entry with that page type, events
  included, so it is only for a page type no event carries (`home`, not
  `product` or `basket`).
- **A case checking that an event is *not* pushed** first shows the page did
  its work (its grid shows products, say), then calls
  `dataLayer.expectNotPushed()`, which also fails on a page without the
  plugin's script. It is for events printed into the page, which are in the
  dataLayer once the page has loaded; it doesn't wait for a JS push unless
  the case says how long to wait (`{ quietMs }`).
  An entry the plugin decides on in `wp_footer` (sign_up on every page, home
  on `/` only) needs no other proof: `varGtmServerSide`, which the check
  requires, comes with the footer scripts after it, so the page's footer
  rendered whatever else it shows.
- **On a page every test shares** (shop, home), a test's own products may be
  on another page of it. The spec checks what holds whatever else is in the
  store (the grid shows products), and looks for its own products on pages
  only it creates (its category, tag or search keyword). A case that has to
  click its own product in the shop opens it newest first
  (`shopPage.goto( { orderby: 'date' } )`) with 100 products to a page
  (`storeOptions( { catalogColumns: '4', catalogRows: '25' } )`), so what the
  tests next to it create can't push the product off page 1.
- **With ecommerce events off** (`storeOptions( { dataLayerEcommerce: 'no' } )`)
  the plugin's frontend script doesn't load, so there is no
  `varGtmServerSide` for `expectNotPushed()` to require. The spec shows the
  page rendered (its product title, grid, cart line, checkout summary line;
  on the front page the site footer, `homePage.footer`) and has a dataLayer
  (the GTM snippet's `entriesWith( 'gtm.start' )` is not empty), then compares
  `dataLayer.entriesWith( 'ecommerce' )` and `entriesWith( 'ecomm_pagetype' )`
  with `[]` and checks `dataLayer.hasPluginConfig()` is `false`.
- **View Source** is the HTML the server sent, before any script ran: the
  page object keeps the response of the page it opened and hands it out as
  `source()` (`productPage.source()`, `myAccountPage.source()`).
- **A case about what every page prints** (the GTM snippet in `<head>`)
  opens its pages with `storefrontPage.goto( path )`, whatever they show,
  and reads `storefrontPage.source()`. Its DevTools → Network filter is
  `storefrontPage.requestedUrls( '<filter text>' )`, the requests of that
  page load. gtm.js is answered by the automatic `stubGtm` fixture, so a
  spec checks the request, not the 404 the placeholder container gets. So
  are the loaders on the case's sGTM URL, `https://sgtm.example.test`, which
  doesn't resolve.
- **Cookies and the user agent** go through the same page object.
  DevTools → Application → Cookies is `storefrontPage.cookie( name )`, and
  editing a value there is `setCookie( name, value )`. A case's curl that
  prints `Set-Cookie` is the page the browser opens, with the cookies the case
  sends set first: `storefrontPage.setCookieHeaders( name )` returns those
  headers, as curl prints them. DevTools → Network conditions → User agent is
  `emulateUserAgent( ua )`, which holds for the rest of the test, so one test
  can switch it between page loads as the case does.
- **A field no entry may carry** (`user_data` with user data off) is read
  with `dataLayer.entriesWith( 'user_data' )`, which returns every entry
  holding it, events or not, and compared with `[]`. It is a snapshot: the
  spec first waits for the events the page pushes (`expectPushedOnce()`).
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
  A case that lists a known defect's error under "Not covered here" (the
  `dataLayer is not defined` of DEV-12902, with placement "Disable" or for a
  user whose role is excluded) lets exactly that uncaught error through with
  `test.use( { knownPageErrors: [ { message, ticket } ] } )`, in a
  `test.describe` of its own. A listed error that never happens fails the
  test, naming its ticket: the defect looks fixed, so the entry goes, and
  the known-defect case can be automated.
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
| A snippet marker or setting several snippet specs share  | `data-layer/gtm-snippet.ts`               |
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
- **A case about what the server keeps after an add that renders no page**
  (`shopPage.addToCartWithoutRendering()`, with `cartRedirectAfterAdd: 'yes'`)
  guards two things, since the stash lives in the WooCommerce session. It
  opens the product page with `productPage.goto( product, { untilCartLoaded:
  true } )`, so the page's own Store API cart request, which saves the session
  when it ends, can't overwrite an add made after it. And it pushes the held
  add with `productPage.flushHeldAdd()`, not `triggerAddedToCart()`: on the
  block theme the event also runs the mini-cart's refresh, which rewrites the
  session and drops the stash, as no classic theme's AJAX add does.
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
- **A case that starts logged in as a customer** creates the account with
  `catalog.createCustomer()` (generated email, names and password; the
  case's address and phone as billing, no shipping address) and logs the
  test's browser in through My Account, `myAccountPage.logIn( customer )`.
  `catalog` deletes the account after the test, with every order it placed,
  whatever contact email the checkout gave them.
  - It does so before the browser closes, so a case that ends right after a
    JS push that fetches `cart_state` (a grid's "Add to cart", say) waits for
    that request first, as `addToCartUntilCartState()` does: still on its
    way, it would answer 403 for the deleted account.
  - A case that needs a contact email other than the account's gives the
    checkout `guestBuyer.email` (`checkoutPage.fillContactEmail()`): it is
    unique, and the preflight deletes the orders killed runs left behind
    with a guest's or a test customer's email (`purgeTestOrders()`).
  - A case whose user has other roles (the folder's Snip Editor, or a user
    with several) creates it the same way with every role it has,
    `catalog.createCustomer( { roles: [ 'customer', 'editor' ] } )`, and
    logs it in through My Account too. Test accounts are deleted through
    WordPress's users endpoint, since WooCommerce's refuses an account
    without the customer role.
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
  answers with the URL it was sent. A case about the pages of a store with
  same-origin configured uses `sameOriginApiKeyOnEveryPage` (see Store
  settings) with the path the store has: the case's own path changes no
  check outside the proxy.

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
  store-wide filter), `endEmailVerificationGrace()`, for a guest order
  link opened more than 10 minutes later (`email-verification-grace.php`),
  and `consentPlatform()`, a consent platform whose stored choice is in the
  dataLayer before the plugin's consent script (`consent-platform.php`).
- **The loader cache is the test's own** after `loaderCache.isolate()`
  (`loader-cache.php`). The plugin caches the identifier's random prefix and
  the encoded Web GTM ID in two site-wide transients, not keyed by the
  identifier, so a test that overrides the identifier with `storeOptions()`
  would share them with every test doing the same. Isolated, it starts with
  an empty cache, as after the case's `wp transient delete`, reads it with
  `loaderCache.read()` (the case's `wp transient get`), and it is deleted
  after the test. Without `isolate()`, `read()` and `clear()` act on the
  site's transients, for a serial test. After `newSession()`, `isolate()`
  again gives the new session the same cache, as the site's is shared by
  every browser window.
- **A setting the test overrides is kept** when the plugin never wrote it:
  the case's `wp option get` would read the database, not the test's
  cookie. `optionWrites.expectNone()` (`record-option-writes.php`) fails on
  any `update_option()`, `add_option()` or `delete_option()` of a setting it
  watches (Cookie Keeper) on the test's browser requests. Add a setting to
  its `GTM_SERVER_SIDE_E2E_RECORDED_OPTIONS` when a case needs it.
- **What the plugin sends from PHP** (a webhook to the sGTM URL, a Customer
  Match upload, a request for the custom loader) is what
  `outgoingHttp.requests()` returns (`record-outgoing-http.php`): every
  `wp_remote_*()` call made while serving the test's browser requests, with
  its URL, method, headers, body and what answered it, oldest first. Each
  test has its own records, so a spec running next to others asserts exactly
  the requests it caused. Give the plugin a URL on a test host
  (`https://<anything>.stape.test/...`, as `storeOptions()` overrides): a
  request there that no other test plugin answers gets an empty 200, so
  nothing leaves the machine. A request sent with no test's cookie (cron, a
  `requestUtils` REST call) isn't recorded: what a case does as the store
  admin goes through the test's own browser, after `loginAsAdmin()`.
- **Two test plugins are always on**, since what they guard against needs
  no test's cookie. `block-stape-api.php` answers every request to the Stape
  API with an error: saving the General tab in wp-admin, and the loader cron,
  which runs with no cookie, would otherwise send the placeholder identifiers
  to it. `site-state.php` only answers its own REST route, for the
  `siteState` fixture (see Store settings).
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
   the helper's `GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS` (and, for a
   setting stored as an array, such as the excluded user roles, to
   `ARRAY_STORE_OPTIONS` and the helper's `GTM_SERVER_SIDE_E2E_ARRAY_OPTIONS`:
   its value is then a list of strings), after checking that:
   - what the test checks doesn't depend on what runs when the option is
     saved (`update_option_<name>` hooks), since an override never saves it.
     Saving the sGTM URL, container ID or Cookie Keeper rebuilds the custom
     loader, so a test of the loader can't override them. Saving same-origin
     enable or path writes the proxy path's rewrite rule, without which the
     proxy answers 404, so they can't be overridden either. Saving the
     same-origin API key only flushes the rewrite rules (and, in wp-admin,
     rebuilds the loader too), and the rule doesn't depend on the key, so a
     test can override it;
   - the override doesn't put the pages in a state no live store has, and
     applies only where the test asks for it. The same-origin API key with
     no loader from the Stape API is a state a live store has: Stape didn't
     send the loader on the save. Since DEV-13426 every page then prints
     Google's GTM snippet, with no Cookie Keeper (the service worker patch
     comes only with the loader). A proxy test doesn't ask for that change,
     so `sameOriginApiKey` applies to requests under the proxy path only
     (the helper's `GTM_SERVER_SIDE_E2E_PROXY_PATH_ONLY_OPTIONS`) and any
     other page renders as without it. A case about those pages uses
     `sameOriginApiKeyOnEveryPage`, the same option on every request (the
     helper's `GTM_SERVER_SIDE_E2E_EVERY_PAGE_ALIASES`);
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
   The test passes `SERIAL` (`fixtures/serial.ts`) as its details,
   `test( '<case title> @T<id>', SERIAL, … )`, in its suite's file, and runs
   in the same run as every other test (lint: a spec never writes `'@serial'`
   or `'-exclusive-'` itself). `SERIAL` carries Playwright's built-in
   exclusive lock, `-exclusive-`: the test starts only once no other test is
   running, and no test starts until it ends. Playwright starts it when the
   workers are free, which in practice is near the end of the run, and runs
   it whether or not other tests failed. It also carries the `@serial` tag,
   which the fixtures read, since a test's locks aren't in `TestInfo`.

   Nothing on the store runs in the background between tests: WP-Cron and
   WooCommerce's async requests reach the site through a loopback request,
   which fails inside wp-env (`wp cron test`: "Failed to connect to
   localhost:8889"). A serial case runs cron itself, so its work ends with
   the test.

   A serial test restores nothing itself. The automatic `siteState` fixture
   reads the site-wide state before it and puts it back after it, failed or
   not (`mu-plugins/site-state.php`): the plugin's options and transients
   (its settings, the custom loader and its error, the loader cache), the
   rewrite rules (the same-origin proxy path's), the active plugins and the
   plugin's cron events. The rows go back raw, so no save hook runs on the
   way back; what the hooks derived comes back with the settings instead.
   Content isn't part of it: the fixtures that create content delete it. A
   serial case that changes some other site-wide state (a WooCommerce
   setting, say) adds its option to the plugin's
   `GTM_SERVER_SIDE_E2E_SITE_STATE_OPTIONS`.

   `adminSettingsPage.save()` refuses to save in a test without `SERIAL`. The
   General tab hides the sGTM URL and identifier while the same-origin proxy
   is on, which it is on the e2e store, so a spec that saves them turns it off
   first (`adminSettingsPage.setSameOriginProxy( false )`, the case's
   baseline).

   A case whose save the tab's validation should block is serial too: if the
   validation breaks, the click saves. With the proxy turned off as above
   (its own empty API key blocks every save on the e2e store), the spec
   clicks with `adminSettingsPage.clickSave()`, which returns whether the
   page reloaded, and reads the message under the field with
   `validationError( '<field id>' )`. The case's `jQuery( … ).valid()` in
   the console is `isValid( field )`, and its `wp option get` is
   `storedOption( '<option>' )`, the database's value whatever
   `storeOptions()` overrides. It reads the plugin's own options only
   (`gtm_server_side_*`, which the site state covers), and its type refuses
   any other name: for one outside the state it would answer `undefined`, as
   for a missing row, so "not saved" would pass whatever was saved.

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
result. Cases tagged `known-defect` or `open-question` are not automated for
now. The `/automate-suite <suite>` skill (`.claude/skills/automate-suite/`)
runs the whole flow for one Testomat suite.

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
