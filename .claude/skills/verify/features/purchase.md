# Purchase

Placing an order pushes one `purchase` on the order-received page with the
order id, value, tax, shipping, currency and items, and never again for that
order: not on reload, nor when the page is opened later.

## Sub-features

- `purchase-checkout` place an order with the Checkout block (Cash on delivery).
- `purchase-once` reloading or reopening order-received pushes no second
  `purchase`.
- `purchase-failed` a failed or cancelled order pushes none.

## How to get to it (user POV)

- Cart, "Proceed to Checkout", fill the billing details, "Place order".

## Driving it with journey.mjs

Preconditions:

- A product from `scripts/product.sh create "E2E verify Order $RANDOM" 20`;
  note its id.
- A guest email you will search for afterwards, such as
  `e2e-verify-$RANDOM@example.com`.

- **Place the order.** Run
  `node .claude/skills/verify/scripts/journey.mjs purchase goto='/shop/?add-to-cart=<id>' goto=/checkout/ 'fill=Email address=<email>' 'fill=First name=E2E' 'fill=Last name=Verify' 'fill=Address=1 Test St' 'fill=City=San Francisco' 'fill=ZIP Code=94105' 'click=radio:Cash on delivery' 'click=button:Place order' expect=purchase quiet=2000 count=purchase=1 eval=location.reload() quiet=2000 count=purchase=1`.
  `transaction_id` in `pushes.json` is the order number shown on the page.
- **Side effect.** `npx wp-env --config=.wp-env.e2e.json run cli wp wc shop_order list --user=admin --search=<email> --fields=id,status,total`
  lists one `processing` order for the price.

## Gotchas

- `eval=location.reload()` reloads in place; the journey's count covers both
  loads.
- Delete the order afterwards:
  `npx wp-env --config=.wp-env.e2e.json run cli wp wc shop_order delete <order id> --user=admin --force=true`.
- Fields and the Cash on delivery radio are the Checkout block's; if a fill
  fails, check the label in `final.png`.
