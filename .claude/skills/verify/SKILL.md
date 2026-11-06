---
name: verify
description: Drive the GTM Server Side WordPress plugin in a real WooCommerce store (wp-env on http://localhost:8889) the way a shopper does, and prove what it pushes to window.dataLayer. Use to confirm a change to the plugin's ecommerce events (view_item, add_to_cart, purchase, ...) works in the browser before calling it done, or to reproduce a tracking bug.
---

# Verify in the e2e store

The plugin's user-facing output is what it pushes to `window.dataLayer`:
inline `<script>` pushes printed by PHP (`includes/class-gtm-server-side-event-*.php`)
and pushes from `assets/js/javascript.js`. A proof is a shopper journey in
Chromium against the e2e store, with every push recorded.

This drives one journey at a time, by hand. The Playwright suite in
`tests/e2e/` (`npm run test:e2e`) is the regression net; use this skill to
prove the change you just made, and to reproduce what a case or a user
reports. The feature map is in [features/README.md](features/README.md).

## Launch

```bash
npm ci                    # once per checkout
npx playwright install chromium   # once per machine
npm run env:e2e:start
```

Ready when the start command prints `✔ Done!` and `doctor.sh` (below)
passes: the setup script runs before `Done!`, so a store that answers earlier
may not be configured yet. A first start downloads WordPress 7.1.2 and
WooCommerce 11.1.2 (about 2.5 minutes); later starts take about a minute.
Run the start in the background: it blocks until done. If a journey fails
with `Executable doesn't exist`, the repo's Playwright version wants a newer
browser: rerun `npx playwright install chromium`. `bin/wp-env-configure.sh` runs on every
start and brings the store to its baseline: block theme Twenty Twenty-Five,
USD, AJAX add to cart on, taxes off, Cash on delivery, the plugin's ecommerce
data layer on with the `_stape` custom event names, and `GTM-TESTID` as the
web container. The store has no products: create them per journey (Drive).

The store is mounted from the checkout that started it, as
`wp-content/plugins/<checkout folder>`, and plugin code changes (PHP and
`assets/js/`) apply on the next request, with no rebuild. Only one store can
hold port 8889. Another worktree's store on 8889 serves that worktree's code:
never drive it, stop it from its own checkout. `.wp-env.json` on port 8888 is
a person's manual store: leave it alone.

## Doctor

Run first, and whenever something looks off:

```bash
.claude/skills/verify/scripts/doctor.sh
```

Read-only. Checks Docker, that 8889's container mounts this checkout's
plugin, that `/shop/` answers 200, that the plugin is active with the
ecommerce data layer on and the e2e helper plugin loaded, and prints the
version and commit (with `+ uncommitted changes` when the tree is dirty).
Each `FAIL` line says what to run.

## Drive

1. Create what the journey needs. Each call prints `<id> <permalink>`:

   ```bash
   .claude/skills/verify/scripts/product.sh create "E2E verify Mug $RANDOM" 20
   ```

2. Run the journey. Each step is one argument; see the header of
   `scripts/journey.mjs` for all of them:

   ```bash
   node .claude/skills/verify/scripts/journey.mjs add-to-cart-product-page \
     goto=/product/e2e-verify-mug-1234/ \
     expect=view_item \
     'click=css:form.cart > button:/add to cart/i' \
     expect=add_to_cart quiet=2000 count=add_to_cart=1 \
     goto=/cart/ expect=view_cart count=add_to_cart=1
   ```

   `click` targets are accessible roles and names, scoped left to right with
   ` > ` (`listitem:<product name> > button:/add to cart/i` for a grid card).
   `css:` is for a stable WooCommerce hook with no accessible name, such as
   `form.cart`; never a theme class.
   `expect` waits for an event, `count` fails unless the total so far is
   exact, across every page of the journey, and `quiet` waits for a push
   that must not come. `options=<json>` overrides store options for this
   browser only, through `tests/e2e/mu-plugins/gtm-server-side-e2e-helper.php`;
   it accepts only the options that file lists in
   `GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS`, and the log prints which it
   applied. Set it before the first `goto`.

3. To drive in a visible window, add `--headed`. To read a page as the
   server sent it, before any script ran, use
   `curl -s http://localhost:8889/<path>` and look for the plugin's
   `dataLayer.push(` lines.

## Evidence

Each journey writes `tests/e2e/artifacts/verify/<timestamp>-<name>/`
(git-ignored):

- `steps.log`: each step, the HTTP status of each page, which store options
  the helper applied, page errors, and every event in push order with its
  page URL;
- `pushes.json`: every push in full, with the URL of the page that made it;
- `NN-<step>.png` after each step, and `final.png` (full page).

Proof standards:

- Drive the real path a shopper takes: the button, the form, the link. Do not
  call `pluginGtmServerSide.*` or trigger `added_to_cart` yourself unless the
  journey stands in for a theme that does exactly that, and say so.
- Count, don't just find: duplicates are this plugin's most common bug, so a
  proof ends with `count=<event>=<n>` after a `quiet=` long enough for a late
  push (`2000` covers the `cart_state` round trip), and on the next page too
  when the event could also be printed there.
- Check the payload in `pushes.json` (items, value, currency), not only the
  event name, and the `{ ecommerce: null }` push right before it.
- A side effect is part of the proof: an order exists after `purchase`
  (`npx wp-env --config=.wp-env.e2e.json run cli wp wc shop_order list --user=admin`),
  the cart holds the item after `add_to_cart`.
- The GTM container `GTM-TESTID` does not exist, so nothing reaches a tag or
  sGTM. That is the production boundary: this proves what the plugin hands
  to GTM, not what GTM sends on.

## Cleanup

```bash
.claude/skills/verify/scripts/product.sh delete <id> ...   # what you created
npm run env:e2e:stop        # only if you started the store
```

The journey closes its own browser. Delete only the products, orders and
accounts your journey made. Leave `tests/e2e/artifacts/verify/` in place: it
is the proof. `npm run env:e2e:destroy` wipes the store's database and is for
a broken store only.

## Gotchas

- `npm run test:e2e` and a journey at the same time: the suite's preflight
  deletes every product whose name starts with `E2E `, yours included, and
  its tests change the shared shop page. Don't run both at once.
- After switching to a branch without `tests/e2e/mu-plugins/`, or back,
  restart the store (`npm run env:e2e:stop && npm run env:e2e:start`);
  doctor reports the helper as missing until then.
- The block theme's mini-cart refreshes the session after `added_to_cart`.
  A journey about what the server stashed after a theme-style AJAX add has to
  account for that (see `tests/e2e/README.md`, Test data).
- Option overrides are read on the browser's requests only, never in cron,
  webhooks or WP-CLI.
