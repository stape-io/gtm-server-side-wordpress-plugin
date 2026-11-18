# Add to cart

Every way a shopper adds a product pushes one `add_to_cart` for it, once:
pushed by the script at click time for an AJAX or Store API add, or stashed in
the session and printed on the next page for an add that loads a page
(`class-gtm-server-side-event-addtocart.php`). The formal model of the dedupe
is the `add-to-cart-once` skill.

## Sub-features

- `atc-product-form` the product page's `form.cart` (a page load).
- `atc-grid-button` a block grid card's button (Store API, no page load).
- `atc-classic-loop` a classic `[products]` loop button (`wc-ajax=add_to_cart`).
- `atc-link-redirect` an `?add-to-cart=` link with "Redirect to the cart page
  after successful addition" on: the add renders no page, and the cart page
  prints the event.
- `atc-quantity` the event's `quantity` and `value` follow the quantity field.

## How to get to it (user POV)

- Product page: the quantity field and "Add to cart".
- Shop, category or search grid: "Add to cart" on a card.
- A link such as `/shop/?add-to-cart=<id>`.

## Driving it with journey.mjs

Preconditions:

- A product from `scripts/product.sh create "E2E verify Cart $RANDOM" 20`;
  note its id, name and permalink.

- **Product form.** Run
  `node .claude/skills/verify/scripts/journey.mjs atc-form goto=<permalink> 'click=css:form.cart > button:/add to cart/i' expect=add_to_cart quiet=2000 count=add_to_cart=1 goto=/cart/ expect=view_cart count=add_to_cart=1`.
  One `add_to_cart_stape` across both pages; the cart page lists the product.
- **Quantity.** Same, with `fill='Product quantity=3'` before the click: the
  item's `quantity` is 3 and `value` is three times the price.
- **Grid button.** Run
  `node .claude/skills/verify/scripts/journey.mjs atc-grid goto='/shop/?orderby=date' 'click=listitem:<name> > button:/add to cart/i' expect=add_to_cart quiet=2000 count=add_to_cart=1 goto=/shop/ quiet=1000 count=add_to_cart=1`.
- **Redirect link.** Run
  `node .claude/skills/verify/scripts/journey.mjs atc-redirect 'options={"woocommerce_cart_redirect_after_add":"yes"}' goto='/shop/?add-to-cart=<id>' expect=add_to_cart quiet=2000 count=add_to_cart=1 goto=/shop/ quiet=1000 count=add_to_cart=1`.
  The log shows the option applied, the browser lands on `/cart/`, and the
  event's URL in `steps.log` is the cart page.

## Gotchas

- A form add posts and reloads the product page: the event is printed by PHP
  on the page that loads, so it appears after the `goto`'s page, not at the
  click.
- Every journey must open one more page after the add and count again: a
  stashed add that was not consumed shows up only there.
- The block mini-cart rewrites the session after `added_to_cart`; see the
  e2e README before driving a theme-style AJAX form add.
