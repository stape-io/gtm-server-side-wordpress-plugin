import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, withoutCartState } from '../../data-layer/expected';

test( 'Add to cart on a block-theme product grid pushes one add_to_cart for the clicked product @T7b4669bf', async ( {
	categoryPage,
	dataLayer,
	product,
} ) => {
	await categoryPage.goto( product.category );
	await categoryPage.addToCart( product.name );

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here.
	// cart_state has its own cases, so it is left out here.
	expect( withoutCartState( addToCart ) ).toEqual( {
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
	} );
} );

test( 'An AJAX add from a classic loop grid pushes one add_to_cart for the clicked product @T38c3a859', async ( {
	catalog,
	classicLoopPage,
	dataLayer,
	phpErrors,
	product,
} ) => {
	const loopPage = await catalog.createClassicLoopPage( product.category );

	await classicLoopPage.goto( loopPage );
	const posts = await classicLoopPage.addToCartRecordingPosts( product.name );

	// WooCommerce's own handler adds over wc-ajax, and the plugin fetches
	// cart_state only after it, for the cart the add has changed.
	expect( posts ).toEqual( [
		{ path: '/?wc-ajax=add_to_cart' },
		{ path: '/wp-admin/admin-ajax.php', action: 'gtm_server_side_state_cart_data' },
	] );

	// The case waits 5 more seconds for a duplicate: long enough for the
	// 1500 ms fallback in _pushWithStateCartData() to push a second one.
	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 5000 } );

	expect( withoutCartState( addToCart ) ).toEqual( {
		event: 'add_to_cart_stape',
		// A contract: see the case's Decision.
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [
			// index is the position in the pushed items array, not in the grid.
			expectedItem( product, { quantity: 1, index: 1 } ),
		] ),
	} );

	await phpErrors.expectNone();
} );

test( 'A theme/plugin AJAX add that triggers added_to_cart pushes the held add_to_cart exactly once @T434fd0c3', async ( {
	dataLayer,
	product,
	productPage,
} ) => {
	await productPage.goto( product );
	await productPage.holdFormSubmit();
	await productPage.setQuantity( 2 );
	await productPage.clickAddToCart();

	// A click on form.cart is expected to load a page, so the plugin holds the
	// item instead of pushing it. The case gives a push 3 seconds to show up.
	await dataLayer.expectNotPushed( 'add_to_cart', { quietMs: 3000 } );

	await productPage.triggerAddedToCart();
	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	expect( withoutCartState( addToCart ) ).toEqual( {
		event: 'add_to_cart_stape',
		ecomm_pagetype: 'product',
		ecommerce: expectedEcommerce( [
			// A simple product: no item_variant key at all.
			expectedItem( product, { quantity: 2, index: 1 } ),
		] ),
	} );

	// The held item was pushed once and dropped: a second added_to_cart
	// without a new click has nothing to push. The case waits 3 seconds.
	await productPage.triggerAddedToCart();
	await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 3000 } );
} );
