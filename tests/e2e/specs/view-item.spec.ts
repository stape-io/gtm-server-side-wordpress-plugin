import { expect, test } from '../fixtures';
import { expectedCartState, expectedEcommerce, expectedItem } from '../data-layer/expected';

/**
 * Unlike add_to_cart, this event is rendered server-side: the plugin prints it
 * into wp_footer when is_product() is true (see
 * includes/class-gtm-server-side-event-viewitem.php), so it does not depend on
 * the theme's markup or on any click handler.
 */
test( 'opening a product page pushes a view_item event for that product', async ( {
	productPage,
	dataLayer,
	product,
} ) => {
	await productPage.goto( product );

	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );

	expect( viewItem ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [ expectedItem( product ) ] ),
		// A fresh anonymous visitor's cart.
		cart_state: expectedCartState( [] ),
	} );
} );
