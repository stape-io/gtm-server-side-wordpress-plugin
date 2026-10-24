import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, withoutCartState } from '../../data-layer/expected';

test( 'Increasing a line\'s quantity in the classic cart and clicking Update cart pushes add_to_cart with quantity = the increase @T3ce30fa3', async ( {
	catalog,
	classicCartPage,
	dataLayer,
	homePage,
	product,
} ) => {
	const cartPage = await catalog.createClassicCartPage();
	await homePage.gotoAddingToCart( product );
	// The precondition's add, pushed on the page it lands on: once it is,
	// nothing of it is left over for the cart page.
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await classicCartPage.goto( cartPage );
	await classicCartPage.setQuantity( product, 3 );
	await classicCartPage.updateCart();

	// The case waits 3 seconds before it counts the entries.
	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 3000 } );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here. cart_state has its own cases.
	expect( withoutCartState( addToCart ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'add_to_cart_stape',
		// A contract: see the case's Decision.
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				// The increase from 1 to 3, not the new line quantity. The case
				// leaves index out; a single item can only be 1.
				expectedItem( product, { quantity: 2, index: 1 } ),
			] ),
			// Pinned rather than computed: 2 x 20.00.
			value: '40.00',
		},
	} );
} );

test( 'Changing a quantity and pressing Enter in the classic cart pushes add_to_cart exactly once @Tbdbcddb8', async ( {
	catalog,
	classicCartPage,
	dataLayer,
	homePage,
	product,
} ) => {
	const cartPage = await catalog.createClassicCartPage();
	await homePage.gotoAddingToCart( product );
	// The precondition's add, pushed on the page it lands on: once it is,
	// nothing of it is left over for the cart page.
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await classicCartPage.goto( cartPage );
	await classicCartPage.submitQuantityWithEnter( product, 3 );

	// The plugin's keypress handler runs on every key typed, and WooCommerce
	// updates the cart on Enter itself: only Enter, with the new value in the
	// field, may push. The case waits 3 seconds for a duplicate.
	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 3000 } );

	// The payload is the case above's; this one checks the quantity only.
	expect( addToCart.event ).toBe( 'add_to_cart_stape' );
	expect( addToCart.ecommerce?.items?.[ 0 ] ).toEqual( expect.objectContaining( { quantity: 2 } ) );
} );
