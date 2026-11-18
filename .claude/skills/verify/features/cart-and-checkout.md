# Cart and checkout: view_cart, remove_from_cart, begin_checkout

The cart page pushes `view_cart` with the cart's lines and total; removing a
line pushes `remove_from_cart`; the checkout page pushes `begin_checkout`.
An empty cart pushes no `view_cart`; the order-received page pushes no
`begin_checkout`.

## Sub-features

- `view-cart` lines, `cart_quantity` as the number of lines, `cart_total`
  after coupons.
- `view-cart-empty` an empty cart pushes nothing.
- `remove-from-cart` removing a line from the cart.
- `begin-checkout` the checkout page, value after coupons.

## How to get to it (user POV)

- The mini-cart's "View cart", or `/cart/`.
- "Proceed to Checkout" on the cart, or `/checkout/`.

## Driving it with journey.mjs

Preconditions:

- A product from `scripts/product.sh create "E2E verify Checkout $RANDOM" 20`;
  note its id and name.

- **Empty cart.** Run
  `node .claude/skills/verify/scripts/journey.mjs cart-empty goto=/cart/ quiet=1000 count=view_cart=0`.
  `final.png` shows "Your cart is currently empty!".
- **View cart.** Run
  `node .claude/skills/verify/scripts/journey.mjs view-cart goto='/shop/?add-to-cart=<id>' expect=add_to_cart goto=/cart/ expect=view_cart quiet=1000 count=view_cart=1`.
  `cart_quantity` is 1 and `cart_total` is the price.
- **Remove.** Continue that journey with
  `'click=button:/remove .*<name>/i' expect=remove_from_cart quiet=1000 count=remove_from_cart=1`.
- **Checkout.** Run
  `node .claude/skills/verify/scripts/journey.mjs begin-checkout goto='/shop/?add-to-cart=<id>' goto=/checkout/ expect=begin_checkout quiet=1000 count=begin_checkout=1`.

## Gotchas

- The cart and checkout are block-based: their remove button and fields
  have accessible names, but the names change between WooCommerce
  releases. Confirm them in `final.png` or with `--headed` when a click
  fails.
- `remove_from_cart` on the block cart is not yet proven by any journey;
  report it as unproven if the click finds no button.
