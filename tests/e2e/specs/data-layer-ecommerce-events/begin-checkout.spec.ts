import { expect, test } from '../../fixtures';
import { expectedEcommerce, expectedItem, withoutCartState } from '../../data-layer/expected';

test( "The checkout page pushes begin_checkout with the cart's items and value = cart total @T0a4f6138", async ( {
	checkoutPage,
	dataLayer,
	homePage,
	product,
	saleProduct,
} ) => {
	await homePage.addToCart( saleProduct, 4 );
	await homePage.addToCart( product, 2 );

	await checkoutPage.goto();
	const beginCheckout = await dataLayer.expectPushedOnce( 'begin_checkout' );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here. cart_state has its own cases.
	expect( withoutCartState( beginCheckout ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'begin_checkout_stape',
		// A contract: see the case's Decision.
		ecomm_pagetype: 'basket',
		ecommerce: {
			// In cart order, indexed from 1.
			...expectedEcommerce( [
				expectedItem( saleProduct, { quantity: 4, index: 1 } ),
				expectedItem( product, { quantity: 2, index: 2 } ),
			] ),
			// Pinned rather than computed: 4 x 35.00 + 2 x 20.00.
			value: '180.00',
		},
	} );
} );

test( 'begin_checkout value is the total after a coupon discount @T959751c5', async ( {
	cartPage,
	catalog,
	checkoutPage,
	dataLayer,
	homePage,
	product,
	saleProduct,
} ) => {
	const coupon = await catalog.createCoupon( '10' );
	// 4 x 35.00 + 2 x 20.00 = 180.00 before the coupon.
	await homePage.addToCart( saleProduct, 4 );
	await homePage.addToCart( product, 2 );
	await cartPage.goto();
	await cartPage.applyCoupon( coupon.code );

	await checkoutPage.goto();
	const beginCheckout = await dataLayer.expectPushedOnce( 'begin_checkout' );

	expect( beginCheckout.event ).toBe( 'begin_checkout_stape' );
	// Pinned rather than computed: 180.00 - 10 %.
	expect( beginCheckout.ecommerce?.value ).toBe( '162.00' );
	// The discount shows in the total only: each item keeps its own price.
	expect( beginCheckout.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_id: String( saleProduct.id ), price: '35.00' } ),
		expect.objectContaining( { item_id: String( product.id ), price: '20.00' } ),
	] );
} );

test( 'begin_checkout value includes tax when prices are entered inclusive of tax @T98e4e7b8', async ( {
	catalog,
	category,
	checkoutPage,
	dataLayer,
	homePage,
	storeOptions,
} ) => {
	await storeOptions( { calcTaxes: 'yes', pricesIncludeTax: 'yes' } );
	// In a tax class of its own, so it taxes this test's product only.
	const tax = await catalog.createTaxRate( { country: 'US', rate: '25' } );
	// 20.00 inclusive of tax: 16.00 net + 4.00 tax.
	const product = await catalog.createProduct( category, { tax_class: tax.taxClass } );
	await homePage.addToCart( product );

	await checkoutPage.goto();
	// The case's step 1: the checkout itself is taxed the way the case expects,
	// or a 20.00 value would pass without any tax.
	await expect( checkoutPage.totalsAmount( tax.name ) ).toHaveText( '$4.00' );
	await expect( checkoutPage.totalsAmount( 'Total' ) ).toHaveText( '$20.00' );
	const beginCheckout = await dataLayer.expectPushedOnce( 'begin_checkout' );

	expect( beginCheckout.event ).toBe( 'begin_checkout_stape' );
	// Gross, not the 16.00 net.
	expect( beginCheckout.ecommerce?.value ).toBe( '20.00' );
} );

test( 'The order-received page pushes no begin_checkout @T017ab21d', async ( {
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	orderReceivedPage,
	product,
} ) => {
	await homePage.addToCart( product );
	await checkoutPage.goto();
	await dataLayer.expectPushedOnce( 'begin_checkout' );

	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.placeOrder();
	// The page rendered the placed order, so a missing push means the plugin
	// chose not to: the cart is empty by now.
	await expect( orderReceivedPage.heading ).toBeVisible();

	await dataLayer.expectNotPushed( 'begin_checkout' );
} );
