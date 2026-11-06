# Category listing: view_item_list and select_item

A product category page pushes one `view_item_list` with up to 10 of its
products in title order. Clicking "Add to cart" on a grid card pushes
`select_item` (from `assets/js/javascript.js`) as well as the add.

## Sub-features

- `item-list-category` a category page lists its products, child categories'
  products included, at most 10, in title order.
- `item-list-none` the shop, tag and search pages push no `view_item_list`.
- `select-item-grid` "Add to cart" on a card pushes `select_item` with the
  page type (`shop`, `category`, `search`, `tag`, `grid`).

## How to get to it (user POV)

- Open a category from the shop or a product's category link
  (`/product-category/<slug>/`).
- Open the shop (`/shop/`), a tag (`/product-tag/<slug>/`) or search (`/?s=<term>&post_type=product`).

## Driving it with journey.mjs

Preconditions:

- A product from `scripts/product.sh create "E2E verify List $RANDOM" 15`. It
  lands in `Uncategorized` (`/product-category/uncategorized/`).

- **Category page.** Run
  `node .claude/skills/verify/scripts/journey.mjs item-list goto=/product-category/uncategorized/ expect=view_item_list quiet=1000 count=view_item_list=1`.
  `pushes.json` has `ecommerce.items` sorted by `item_name`, at most 10.
- **No list on the shop.** Run
  `node .claude/skills/verify/scripts/journey.mjs no-list goto='/shop/?orderby=date' expect=view_item_list`;
  it must end `FAILED: view_item_list was never pushed`. The shop's grid
  showing products in `final.png` proves the page rendered.
- **select_item.** Run
  `node .claude/skills/verify/scripts/journey.mjs select-item goto='/shop/?orderby=date' 'click=listitem:<product name> > button:/add to cart/i' expect=select_item expect=add_to_cart quiet=2000 count=select_item=1 count=add_to_cart=1`.
  The `select_item_stape` entry has `ecomm_pagetype: "shop"`.

## Gotchas

- `Uncategorized` and the shop are shared with every other product in the
  store, so the list may not hold yours. Open the shop newest first
  (`?orderby=date`) and look for your own product by name.
- A product in a category of its own needs `wp wc product_cat create` and
  `--categories`; delete the category afterwards too.
