---
name: add-to-cart-once
description: Model-check that an add to cart is never reported twice as add_to_cart, across the browser's held push, the server's session stash and the token cookie (TLA+, tests/formal/add-to-cart). Use when a change touches trackAddToCart, flushPendingAddToCart, _pushWithStateCartData or _sendStateCartDataAjax in assets/js/javascript.js, or GTM_Server_Side_Event_AddToCart's stash, token cookie or wp_footer.
---

# add_to_cart is sent once

**Property.** Each add to cart reaches dataLayer as `add_to_cart` at most
once, whichever way it was made and whatever the shopper does next.
**Harm if broken.** GA4 and every tag downstream count the add twice, and the
revenue funnel is inflated.

The check is a TLA+ model of both sides, run by TLC. It explores every order
of clicks, requests, responses, `added_to_cart` events and page loads within
small bounds, which the e2e suite can only sample one by one.

## Does your change touch it?

Covered code (sync commit below):

| Code | In the model |
| --- | --- |
| `assets/js/javascript.js` `trackAddToCart` | `ClickWcAjax`, `ClickThemeAjax`, `ClickPageLoad` |
| `assets/js/javascript.js` `flushPendingAddToCart` and its `onPushed` | `FireAddedToCart`, `Push(_, TRUE)` |
| `assets/js/javascript.js` `_pushToDataLayer`, `_pushWithStateCartData`, `_sendStateCartDataAjax` | `Push`, `FireDeferred` (`CustomEventName`) |
| `assets/js/javascript.js` the `added_to_cart` handler in `jQuery( document ).ready` | `Deliver`, `FireAddedToCart` |
| `includes/class-gtm-server-side-event-addtocart.php` `woocommerce_add_to_cart`, `is_page_load_request`, `get_request_token` | `EndThemeAjax`, `EndPageAdd`, `EndWcAjax` |
| same file, `wp_footer`, `drop_pushed_items` | `Shown`, `EndNav`, `EndPageAdd` |
| `TOKEN_COOKIE` / `ADD_TO_CART_TOKEN_COOKIE`, `SESSION_ITEMS_KEY` | `cookie`, `session` |

Not modelled: `drop_expired_items` and `PENDING_ADD_TO_CART_MAX_AGE` (time;
they only drop events, they never add one), the item payload, `select_item`,
`remove_from_cart`, and a token stashed as `''` because headers were already
sent.

To see whether covered code moved since the model was last confirmed:

```bash
git diff --stat bf7c712 -- assets/js/javascript.js includes/class-gtm-server-side-event-addtocart.php
```

If the diff touches a function in the table, the model needs a look even if
the check still passes.

## Run it

```bash
tests/formal/add-to-cart/run.sh
```

Needs Docker (the e2e store already needs it). The first run downloads a
pinned `tla2tools.jar` (v1.7.4, checksum checked) into
`tests/formal/add-to-cart/.cache/`. The whole run takes a few seconds.
`run.sh -v <config>` prints TLC's full output with the counterexample trace;
`run.sh -v <config> | grep -E '^State|pushed =|cookie =|session ='` gives
its outline.

Each config has an expected result in `EXPECTED` in `run.sh`. `ok` means the
result matches. `CHANGED` means it differs, and the script exits non-zero:

| Config | Scope | Expected |
| --- | --- | --- |
| `one` | one add, custom event name off | pass |
| `one-custom` | one add, custom event name on | pass |
| `two` | two adds on one page | `AtMostOnce` fails: finding 1 |
| `two-custom` | the same, custom event name on | `AtMostOnce` fails: finding 1 |
| `overlap` | one add, requests overlapping on the WooCommerce session | `AtMostOnce` fails: finding 2 |
| `lost` | one add, checks `AtLeastOnce` instead | fails: finding 3 |

All configs bound plain navigations at 2 and background session requests
at 1. `SessionsOverlap = FALSE` lets only one request hold the session at a
time, so the plugin's own logic is checked apart from WooCommerce's session
race.

Read every trace with the pstack `/statechart` skill: it turns an invariant
violation into its shortest path in plain words, and when a config passes it
draws how the system moves between states.

## Known findings (at bf7c712)

1. **A held add is pushed for another add's `added_to_cart`.** The shopper
   adds a1 with WooCommerce's AJAX button, such as in related products on a
   product page. Before a1 returns, they submit the theme's AJAX product form
   for a2, so `trackAddToCart` holds a2. a1's `added_to_cart` runs
   `flushPendingAddToCart`, which pushes a2 and deletes a token cookie that
   has not been set yet. a2's response then sets the cookie to a2, and a2's
   own `added_to_cart` finds nothing held. On the next page `wp_footer` finds
   a2 stashed under a matching cookie and pushes a2 again. Two theme AJAX adds
   in a row (a double click) end the same way. Cause: the pending slot and the
   cookie are not tied to the add whose request landed.
2. **A session write puts a rendered stash back.** A request that loaded the
   session after an add was stashed (another tab, a Store API cart fetch, a
   mini-cart refresh) saves it after the next page rendered and unset the
   stash. `WC_Session_Handler` saves the whole session, so the stash returns.
   The cookie still holds the token, because nothing clears it after a server
   render, so the following page pushes the add again.
3. **Leaving during a theme AJAX add loses it.** If the page unloads before
   the response arrives, the browser drops the response and its Set-Cookie.
   The stash's token never matches the cookie, so `drop_pushed_items` drops
   it, and nothing reports the add. Before DEV-13298 the next page showed it.
   `lost` also fails for losses the plugin accepts on purpose, such as leaving
   before a `cart_state` push fires. Read its trace before calling a loss new.

None of them is fixed. Product code was left alone.

## When the check says something new

- **`CHANGED`, from pass to a violation.** Run `run.sh -v <config>` and read
  the trace. Map each step to the code using the table above. If every step
  is something the code really does, it is a bug: report the trace in the
  code's words and don't weaken the model. If a step does something the code
  can't do, the model is wrong: fix the action and say why in a comment.
- **`CHANGED`, from a known finding to pass.** A fix may have landed. Confirm
  in the code that the cause named in the finding is gone, then set the
  config's `EXPECTED` to `pass` and move the finding out of this file.
- **TLC error (parse, type, deadlock).** The model is broken, not the code.
  `TypeOK` failing means a variable took a value the model doesn't allow.

## When you change covered code on purpose

1. Mirror the change in `tests/formal/add-to-cart/AddToCart.tla`. One code
   step is one action: the server reads the session at the start of a request
   and writes all of it at the end. The browser applies a response's
   Set-Cookie and queues `added_to_cart` only while the page that sent the
   request is still open.
2. Run `run.sh`. A new or different violation is the behaviour your change
   introduces, so read it before touching `EXPECTED`.
3. Prove the new model can still fail. Break the code you changed (a scratch
   edit to the model, such as rendering every stashed item in `Shown` or
   passing `FALSE` to `Push` in `FireAddedToCart`) and see `one` turn
   `CHANGED`. Then revert the scratch edit.
4. Once the model describes the code at your commit, update the sync commit
   below and in the `git diff` command above. Never move it forward without
   that check.

## Sync

Model last confirmed against the code at **bf7c712**.
