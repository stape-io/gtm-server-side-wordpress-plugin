# GTM Server Side verification map

The maintained source for verifying what the plugin pushes to `window.dataLayer`
along a shopper's path. Read this index, then use the matching feature file as
the recipe. Each journey runs with `scripts/journey.mjs` (see `../SKILL.md`).

| Feature | File | Events |
| --- | --- | --- |
| Product page | [view-item.md](view-item.md) | `view_item` |
| Category listing and clicks | [view-item-list.md](view-item-list.md) | `view_item_list`, `select_item` |
| Add to cart | [add-to-cart.md](add-to-cart.md) | `add_to_cart` |
| Cart and checkout | [cart-and-checkout.md](cart-and-checkout.md) | `view_cart`, `remove_from_cart`, `begin_checkout` |
| Purchase | [purchase.md](purchase.md) | `purchase` |

Proven end to end at bf7c712: `atc-product-form` and `atc-link-redirect`.
The other recipes are written from the e2e specs and page objects and have
not been run yet; a first run that needs a different step fixes the file.

Not mapped yet: `sign_up` and `login` (My Account), the home page type, user
data, the same-origin proxy (`/metrics`), the wp-admin settings tabs, and
webhooks to sGTM.

## Baseline preconditions

- `scripts/doctor.sh` passes: the store on `:8889` runs this checkout's plugin.
- The baseline from `bin/wp-env-configure.sh`: custom event names on, so every
  event carries the `_stape` suffix and a `cart_state` (journey steps match
  either name).
- Products come from `scripts/product.sh create "E2E verify <unique>" <price>`.
  The store has none of its own.
- A fresh browser per journey: an empty cart and no session.

## Driving conventions

- Drive what a shopper clicks, by accessible role and name. `css:` only for a
  WooCommerce hook with no name (`form.cart`).
- Prove a count, not a presence: end with `quiet=2000 count=<event>=1`, then
  open the next page and count again when the server could print the event
  there too.
- Read the payload in `pushes.json`, and the `{ ecommerce: null }` push just
  before the event.
- A setting other than the baseline goes in `options=` with the WordPress
  option name, before the first `goto`.

## Proof and skip reporting

- Report the feature ID, the entry point you drove, and the evidence folder.
- An entry point you could not reach is reported with the step that failed
  and the missing precondition, never as covered by another entry point.
- Delete the products and orders you made. Keep the evidence.

## Feature entry contract

Each file has an H1, one paragraph, and four H2s in this order:
`Sub-features`, `How to get to it (user POV)`, `Driving it with journey.mjs`,
`Gotchas`.
