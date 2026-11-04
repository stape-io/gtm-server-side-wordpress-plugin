# Product page: view_item

Opening a product page pushes one `view_item` with the product as its only
item. PHP prints it in the page (`class-gtm-server-side-event-viewitem.php`).

## Sub-features

- `view-item-simple` a simple product, at its regular or sale price.
- `view-item-variable` a variable product: the parent at its lowest variation
  price, no `item_variant`.
- `view-item-grouped` a grouped product at its lowest child price.

## How to get to it (user POV)

- Click a product's name or image in the shop, a category or search results.
- Open the product URL directly.

## Driving it with journey.mjs

Preconditions:

- A product from `scripts/product.sh create "E2E verify View $RANDOM" 20`; note
  its permalink.

- **Open the product.** Run
  `node .claude/skills/verify/scripts/journey.mjs view-item goto=<permalink> expect=view_item quiet=2000 count=view_item=1`.
  `RESULT: ok`.
- **Check the payload.** In `pushes.json`, the `view_item_stape` entry has
  `ecomm_pagetype: "product"`, `ecommerce.currency: "USD"`, `ecommerce.value`
  equal to the price, and one item whose `item_name` is the product's name;
  the entry before it is `{ "ecommerce": null }`.
- **As the server sent it.** `curl -s <permalink> | grep -c 'view_item'`
  is at least 1: the push is in the HTML, not added by a script.

## Gotchas

- `view_item_list` is a different event: match exactly (`count` does).
- Variable and grouped products need WP-CLI arguments `product.sh` does not
  take (`--type=variable`, attributes, variations); create them with
  `npx wp-env --config=.wp-env.e2e.json run cli wp wc product create --user=admin ...`.
