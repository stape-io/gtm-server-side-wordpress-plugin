import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, expectedRemoveFromCartEcommerce, withoutCartState } from '../../data-layer/expected';

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet (DEV-12579)
test( 'Removing a line from the Cart block pushes remove_from_cart with the line\'s quantity', async ( {
	cartPage,
	dataLayer,
	homePage,
	phpErrors,
	product,
} ) => {
	await homePage.gotoAddingToCart( product, 2 );
	// The precondition's add, pushed on the page it lands on: once it is,
	// nothing of it is left over for the cart page.
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await cartPage.goto();
	await cartPage.remove( product );

	const removeFromCart = await dataLayer.expectPushedOnce( 'remove_from_cart' );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here. cart_state has its own cases.
	expect( withoutCartState( removeFromCart ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'remove_from_cart_stape',
		ecommerce: expectedRemoveFromCartEcommerce( [
			// The whole line: both units left the cart. index is what the
			// server puts on the line, as on the classic cart's remove link.
			expectedItem( product, { quantity: 2, index: 1 } ),
		] ),
	} );

	await phpErrors.expectNone();
} );

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet (DEV-12579)
test( 'Increasing a line\'s quantity in the Cart block pushes add_to_cart with quantity = the increase', async ( {
	cartPage,
	dataLayer,
	homePage,
	product,
} ) => {
	await homePage.gotoAddingToCart( product, 2 );
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await cartPage.goto();
	await cartPage.increaseQuantity( product );

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart' );

	expect( withoutCartState( addToCart ) ).toEqual( {
		event: 'add_to_cart_stape',
		// What pushAddToCart() sends wherever the add happens.
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				// The increase from 2 to 3, not the new line quantity.
				expectedItem( product, { quantity: 1, index: 1 } ),
			] ),
			// Pinned rather than computed: 1 x 20.00.
			value: '20.00',
		},
	} );
} );

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet (DEV-12579)
test( 'Decreasing a line\'s quantity in the Cart block pushes remove_from_cart with quantity = the decrease', async ( {
	cartPage,
	dataLayer,
	homePage,
	product,
} ) => {
	await homePage.gotoAddingToCart( product, 3 );
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await cartPage.goto();
	await cartPage.setQuantity( product, 1 );

	const removeFromCart = await dataLayer.expectPushedOnce( 'remove_from_cart' );

	expect( withoutCartState( removeFromCart ) ).toEqual( {
		event: 'remove_from_cart_stape',
		ecommerce: expectedRemoveFromCartEcommerce( [
			// The decrease from 3 to 1, not the quantity left.
			expectedItem( product, { quantity: 2, index: 1 } ),
		] ),
	} );
	await dataLayer.expectNotPushed( 'add_to_cart' );
} );
