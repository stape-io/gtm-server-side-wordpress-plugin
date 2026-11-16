import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, withoutCartState } from '../../data-layer/expected';

test( 'Increasing a line\'s quantity in the Cart block pushes add_to_cart with quantity = the increase @T9353e248', async ( {
	cartPage,
	dataLayer,
	homePage,
	product,
} ) => {
	await homePage.gotoAddingToCart( product );
	// The precondition's add, pushed on the page it lands on: once it is,
	// nothing of it is left over for the cart page.
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await cartPage.goto();
	const saved = await cartPage.increaseQuantity( product );

	expect( new URL( saved.url() ).pathname ).toBe( '/wp-json/wc/store/v1/cart/update-item' );
	await expect( cartPage.quantity( product ) ).toHaveValue( '2' );

	// The case waits 3 seconds before it counts the entries.
	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 3000 } );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here. cart_state has its own cases.
	expect( withoutCartState( addToCart ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'add_to_cart_stape',
		// The case leaves ecomm_pagetype out; pushAddToCart() sends `product`
		// wherever the add happens, as the Mini-Cart case pins.
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				// The increase from 1 to 2, not the new line quantity. The case
				// leaves index out; a single item can only be 1.
				expectedItem( product, { quantity: 1, index: 1 } ),
			] ),
			// Pinned rather than computed: 1 x 20.00.
			value: '20.00',
		},
	} );
} );

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

test( 'Decreasing a line\'s quantity in the Cart block pushes remove_from_cart with quantity = the decrease @Tde283af1', async ( {
	cartPage,
	dataLayer,
	homePage,
	product,
} ) => {
	await homePage.gotoAddingToCart( product, 3 );
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await cartPage.goto();
	const saved = await cartPage.setQuantity( product, 1 );

	expect( new URL( saved.url() ).pathname ).toBe( '/wp-json/wc/store/v1/cart/update-item' );
	await expect( cartPage.quantity( product ) ).toHaveValue( '1' );

	const removeFromCart = await dataLayer.expectPushedOnce( 'remove_from_cart', { quietMs: 3000 } );

	expect( withoutCartState( removeFromCart ) ).toEqual( {
		event: 'remove_from_cart_stape',
		ecommerce: {
			// The block's remove_from_cart carries value, as every other
			// event with a currency does (DEV-12579).
			...expectedEcommerce( [
				// The decrease from 3 to 1, not the quantity left.
				expectedItem( product, { quantity: 2, index: 1 } ),
			] ),
			// Pinned rather than computed: 2 x 20.00.
			value: '40.00',
		},
	} );
	await dataLayer.expectNotPushed( 'add_to_cart' );
} );

test( 'Increasing a line\'s quantity in the Mini-Cart drawer pushes add_to_cart with quantity = the increase @T3072e011', async ( {
	dataLayer,
	homePage,
	miniCart,
	product,
	shopPage,
} ) => {
	await homePage.gotoAddingToCart( product, 2 );
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await shopPage.goto();
	await miniCart.open();
	const saved = await miniCart.increaseQuantity( product );

	// The drawer queues its changes into a batch: the update-item is inside it.
	expect( new URL( saved.url() ).pathname ).toBe( '/wp-json/wc/store/v1/batch' );
	expect( saved.request().postDataJSON().requests ).toEqual( [
		expect.objectContaining( { method: 'POST', path: '/wc/store/v1/cart/update-item' } ),
	] );
	await expect( miniCart.quantity( product ) ).toHaveValue( '3' );

	const addToCart = await dataLayer.expectPushedOnce( 'add_to_cart', { quietMs: 3000 } );

	expect( withoutCartState( addToCart ) ).toEqual( {
		event: 'add_to_cart_stape',
		ecomm_pagetype: 'product',
		ecommerce: {
			...expectedEcommerce( [
				// The increase from 2 to 3, not the new line quantity.
				expectedItem( product, { quantity: 1, index: 1 } ),
			] ),
			value: '20.00',
		},
	} );
} );

test( 'Decreasing a line\'s quantity in the Mini-Cart drawer pushes remove_from_cart with quantity = the decrease @Tcb2ce191', async ( {
	dataLayer,
	homePage,
	miniCart,
	product,
	shopPage,
} ) => {
	await homePage.gotoAddingToCart( product, 3 );
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await shopPage.goto();
	await miniCart.open();
	const saved = await miniCart.setQuantity( product, 1 );

	expect( new URL( saved.url() ).pathname ).toBe( '/wp-json/wc/store/v1/batch' );
	expect( saved.request().postDataJSON().requests ).toEqual( [
		expect.objectContaining( { method: 'POST', path: '/wc/store/v1/cart/update-item' } ),
	] );
	await expect( miniCart.quantity( product ) ).toHaveValue( '1' );

	const removeFromCart = await dataLayer.expectPushedOnce( 'remove_from_cart', { quietMs: 3000 } );

	expect( withoutCartState( removeFromCart ) ).toEqual( {
		event: 'remove_from_cart_stape',
		ecommerce: {
			...expectedEcommerce( [
				expectedItem( product, { quantity: 2, index: 1 } ),
			] ),
			value: '40.00',
		},
	} );
	await dataLayer.expectNotPushed( 'add_to_cart' );
} );
