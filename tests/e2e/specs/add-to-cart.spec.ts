import { expect, test } from '../fixtures';
import {
	expectedCartLine,
	expectedCartState,
	expectedEcommerce,
	expectedItem,
} from '../data-layer/expected';

test( 'Add to cart on the Baseline shop grid pushes one add_to_cart for the clicked product @T7b4669bf', async ( {
	categoryPage,
	dataLayer,
	product,
} ) => {
	await categoryPage.goto( product.category );
	await categoryPage.addToCart( product.name );

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here.
	expect( addToCart ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'add_to_cart_stape',
		// Current behaviour, captured on purpose: pushAddToCart() in
		// assets/js/javascript.js sends 'product' wherever the click happens,
		// including this category page.
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [
			// index is the position in the pushed items array, not in the grid.
			expectedItem( product, { quantity: 1, index: 1 } ),
		] ),
		// Built server side from the real WC_Cart, so a passing ecommerce
		// payload can't hide a cart that never actually updated.
		cart_state: expectedCartState( [ expectedCartLine( product, 1 ) ] ),
	} );
} );
