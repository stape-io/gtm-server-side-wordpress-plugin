import { expect, test } from '../fixtures';
import { expectedEcommerce, expectedItem, withoutCartState } from '../data-layer/expected';

/**
 * Unlike add_to_cart, this event is rendered server-side: the plugin prints it
 * into wp_footer when is_product() is true (see
 * includes/class-gtm-server-side-event-viewitem.php), so it does not depend on
 * the theme's markup or on any click handler.
 */
test( "view_item reports a simple product's id, SKU, name, price and category, once per page view @Ta58bd16c", async ( {
	productPage,
	dataLayer,
	product,
} ) => {
	await productPage.goto( product );

	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );

	// cart_state has its own cases, so it is left out here.
	expect( withoutCartState( viewItem ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'view_item_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [ expectedItem( product ) ] ),
	} );
} );
