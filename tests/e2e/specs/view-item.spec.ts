import { expect, test } from '../fixtures';

/**
 * Unlike add_to_cart, this event is rendered server-side: the plugin prints it
 * into wp_footer when is_product() is true (see
 * includes/class-gtm-server-side-event-viewitem.php), so it does not depend on
 * the theme's markup or on any click handler.
 *
 * Navigating straight to the permalink the REST API returned means the spec
 * never has to find the product in a listing first, which would drag the shop
 * grid's markup into a test that has nothing to do with it.
 */
test( 'opening a product page pushes a view_item event for that product', async ( {
	page,
	dataLayer,
	product,
} ) => {
	await page.goto( product.permalink );

	const viewItem = await dataLayer.waitFor( 'view_item' );

	// The name GTM actually receives, suffix included: '_stape' is
	// GTM_SERVER_SIDE_DATA_LAYER_CUSTOM_EVENT_NAME (bootstrap.php), and the
	// setup project has already asserted the suffix is switched on.
	expect( viewItem.event ).toBe( 'view_item_stape' );
	expect( viewItem.ecomm_pagetype ).toBe( 'product' );

	expect( viewItem.ecommerce ).toEqual( {
		currency: 'USD',
		value: product.price,
		items: [
			{
				item_id: String( product.id ),
				item_name: product.name,
				item_sku: product.sku,
				price: product.price,
				// Empty rather than absent: the factory creates a bare product,
				// and asserting the exact object means a newly added or dropped
				// key fails here instead of silently reaching GTM.
				item_brand: '',
				item_category: 'Uncategorized',
				imageUrl: '',
			},
		],
	} );

	// A product page is not a cart mutation, so for a fresh anonymous visitor
	// the cart state riding along has to be an empty one.
	expect( viewItem.cart_state ).toEqual( {
		cart_id: expect.any( String ),
		cart_quantity: 0,
		cart_value: '0.00',
		currency: 'USD',
		lines: [],
	} );
} );
