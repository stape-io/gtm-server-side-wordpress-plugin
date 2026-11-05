import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, withoutCartState } from '../../data-layer/expected';

test( 'Removing a line in the Cart block pushes one remove_from_cart for the removed line @T29514b1a', async ( {
	cartPage,
	dataLayer,
	homePage,
	phpErrors,
	product,
} ) => {
	await homePage.gotoAddingToCart( product );
	// The precondition's add, pushed on the page it lands on: once it is,
	// nothing of it is left over for the cart page.
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await cartPage.goto();
	const removed = await cartPage.remove( product );

	expect( new URL( removed.url() ).pathname ).toBe( '/wp-json/wc/store/v1/batch' );
	await expect( cartPage.emptyCartNotice ).toBeVisible();

	// The case waits 3 seconds before it counts the entries.
	const removeFromCart = await dataLayer.expectPushedOnce( 'remove_from_cart', { quietMs: 3000 } );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here. cart_state has its own cases.
	expect( withoutCartState( removeFromCart ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'remove_from_cart_stape',
		ecommerce: {
			...expectedEcommerce( [
				// The case leaves index out; a single item can only be 1.
				expectedItem( product, { quantity: 1, index: 1 } ),
			] ),
			// Pinned rather than computed: 1 x 20.00.
			value: '20.00',
		},
	} );

	await phpErrors.expectNone();
} );

test( 'Removing an item in the Mini-Cart block drawer pushes one remove_from_cart for the removed item @T4305e1cf', async ( {
	dataLayer,
	homePage,
	miniCart,
	phpErrors,
	product,
	shopPage,
} ) => {
	await homePage.gotoAddingToCart( product );
	await dataLayer.expectPushedOnce( 'add_to_cart' );

	await shopPage.goto();
	await miniCart.open();
	await miniCart.remove( product );

	await expect( miniCart.emptyCartNotice ).toBeVisible();

	const removeFromCart = await dataLayer.expectPushedOnce( 'remove_from_cart', { quietMs: 3000 } );

	expect( withoutCartState( removeFromCart ) ).toEqual( {
		event: 'remove_from_cart_stape',
		ecommerce: {
			...expectedEcommerce( [
				expectedItem( product, { quantity: 1, index: 1 } ),
			] ),
			value: '20.00',
		},
	} );

	await phpErrors.expectNone();
} );

test( 'Removing a line in the classic cart pushes one remove_from_cart with the line\'s item, quantity and value @T20d63258', async ( {
	catalog,
	classicCartPage,
	dataLayer,
	homePage,
	product,
} ) => {
	const cartPage = await catalog.createClassicCartPage();
	// Quantity 2, not 1: the plugin falls back to 1 when it reads none, so
	// only 2 shows that it reads the line's quantity.
	await homePage.addToCart( product, 2 );

	await classicCartPage.goto( cartPage );
	await classicCartPage.remove( product );

	const removeFromCart = await dataLayer.expectPushedOnce( 'remove_from_cart', { quietMs: 3000 } );

	expect( withoutCartState( removeFromCart ) ).toEqual( {
		event: 'remove_from_cart_stape',
		ecommerce: {
			...expectedEcommerce( [
				expectedItem( product, { quantity: 2, index: 1 } ),
			] ),
			// Pinned rather than computed: 2 x 20.00.
			value: '40.00',
		},
	} );
} );
