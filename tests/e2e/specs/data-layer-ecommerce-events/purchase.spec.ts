import { expect, test } from '../../fixtures';
import { expectedItem, STORE_CURRENCY, withoutCartState } from '../../data-layer/expected';

test( 'Placing an order with the Checkout block pushes one purchase on order-received with transaction_id, value, tax, shipping, currency and the ordered items @Taeca1846', async ( {
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	orderReceivedPage,
	product,
} ) => {
	await homePage.addToCart( product, 2 );
	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.placeOrder();

	const orderNumber = await orderReceivedPage.orderNumber();
	const purchase = await dataLayer.expectPushedOnce( 'purchase' );

	// The whole event, not objectContaining: a field the plugin stops or
	// starts sending has to fail here. cart_state has its own cases.
	expect( withoutCartState( purchase ) ).toEqual( {
		// Spelled out rather than resolved, so a dropped suffix fails here.
		event: 'purchase_stape',
		ecomm_pagetype: 'purchase',
		ecommerce: {
			transaction_id: orderNumber,
			currency: STORE_CURRENCY,
			// Pinned rather than computed: 2 x 20.00.
			value: '40.00',
			// The baseline store has no taxes and no shipping.
			tax: '0.00',
			shipping: '0.00',
			affiliation: '',
			coupon: '',
			discount_amount: '0.00',
			items: [ expectedItem( product, { quantity: 2, index: 1, discount: '0.00' } ) ],
		},
	} );
} );

test( 'Reloading order-received pushes no second purchase @T57614e41', async ( {
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	orderReceivedPage,
	product,
} ) => {
	await homePage.addToCart( product, 2 );
	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.placeOrder();
	await dataLayer.expectPushedOnce( 'purchase' );

	await orderReceivedPage.reload();
	// The page found the order again, so a missing push means the plugin
	// chose not to send it twice.
	await expect( orderReceivedPage.heading ).toBeVisible();

	await dataLayer.expectNotPushed( 'purchase' );
} );

test( 'Opening order-received again later or in another session (e.g. from the email) pushes no purchase @Tdea28324', async ( {
	dataLayer,
	checkoutPage,
	guestBuyer,
	homePage,
	newSession,
	orderReceivedPage,
	product,
	shopPage,
	testPlugins,
} ) => {
	await homePage.addToCart( product, 2 );
	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.placeOrder();
	await dataLayer.expectPushedOnce( 'purchase' );
	const receivedUrl = orderReceivedPage.url();

	// Step 2: the same session, after another page.
	await shopPage.goto();
	expect( await shopPage.productNames() ).not.toEqual( [] );
	await orderReceivedPage.goto( receivedUrl );
	await expect( orderReceivedPage.heading ).toBeVisible();
	await dataLayer.expectNotPushed( 'purchase' );

	// Step 3: a new private window, within the 10 minutes WooCommerce shows a
	// guest's order to any session holding its key.
	await newSession();
	await orderReceivedPage.goto( receivedUrl );
	await expect( orderReceivedPage.heading ).toBeVisible();
	await dataLayer.expectNotPushed( 'purchase' );

	// Step 4: another new private window, once that grace period is over, as
	// for the link in the order email opened later.
	await newSession();
	await testPlugins.endEmailVerificationGrace();
	await orderReceivedPage.goto( receivedUrl );
	await expect( orderReceivedPage.emailVerificationButton ).toBeVisible();
	await orderReceivedPage.verifyEmail( guestBuyer.email );
	await dataLayer.expectNotPushed( 'purchase' );
} );

test( 'purchase is pushed only on order-received, not on the first page rendered after the order @T325428ba', async ( {
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	orderReceivedPage,
	product,
} ) => {
	await homePage.addToCart( product, 2 );
	// No order-received page is rendered in between.
	const order = await checkoutPage.placeOrderThroughStoreApi( guestBuyer );

	await homePage.goto();
	// The push still comes on order-received below, so the home page had the
	// order in its session and chose not to send it.
	await dataLayer.expectNotPushed( 'purchase' );

	await orderReceivedPage.goto( order.receivedUrl );
	const purchase = await dataLayer.expectPushedOnce( 'purchase' );

	expect( purchase.event ).toBe( 'purchase_stape' );
	expect( purchase.ecommerce?.transaction_id ).toBe( String( order.id ) );
	// Pinned rather than computed: 2 x 20.00.
	expect( purchase.ecommerce?.value ).toBe( '40.00' );
} );

test( 'purchase items with a coupon and quantity > 1 report the unit price minus the whole-line discount @T90a463d4', async ( {
	cartPage,
	catalog,
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	product,
	saleProduct,
} ) => {
	const coupon = await catalog.createCoupon( '10' );
	// Lines: 4 x 35.00 = 140.00 and 2 x 20.00 = 40.00, before the coupon.
	await homePage.addToCart( saleProduct, 4 );
	await homePage.addToCart( product, 2 );
	await cartPage.goto();
	await cartPage.applyCoupon( coupon.code );
	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.placeOrder();

	const purchase = await dataLayer.expectPushedOnce( 'purchase' );

	expect( purchase.event ).toBe( 'purchase_stape' );
	// Pinned rather than computed: the whole line's 10 % comes off one unit.
	expect( purchase.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_name: saleProduct.name, price: '21.00', discount: '14.00', quantity: 4 } ),
		expect.objectContaining( { item_name: product.name, price: '16.00', discount: '4.00', quantity: 2 } ),
	] );
	// 180.00 - 10 %.
	expect( purchase.ecommerce?.value ).toBe( '162.00' );
} );

test( "purchase items report the product's price at render time, not the price in the order @Tcb24cd1e", async ( {
	catalog,
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	orderReceivedPage,
	saleProduct,
} ) => {
	await homePage.addToCart( saleProduct, 1 );
	// Ordered at the sale price, 35.00.
	const order = await checkoutPage.placeOrderThroughStoreApi( guestBuyer );
	// Before any page is rendered in the buyer's session.
	await catalog.updateProduct( saleProduct, { sale_price: '40.00' } );

	await orderReceivedPage.goto( order.receivedUrl );
	const purchase = await dataLayer.expectPushedOnce( 'purchase' );

	expect( purchase.event ).toBe( 'purchase_stape' );
	expect( purchase.ecommerce?.items ).toEqual( [
		expect.objectContaining( { item_id: String( saleProduct.id ), price: '40.00' } ),
	] );
	expect( purchase.ecommerce?.value ).toBe( '35.00' );
} );

test( 'purchase coupon and discount_amount list the applied coupon code and the order discount total @T8c8712d0', async ( {
	cartPage,
	catalog,
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	product,
	saleProduct,
} ) => {
	const coupon = await catalog.createCoupon( '10' );
	await homePage.addToCart( saleProduct, 4 );
	await homePage.addToCart( product, 2 );
	await cartPage.goto();
	await cartPage.applyCoupon( coupon.code );
	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.placeOrder();

	const purchase = await dataLayer.expectPushedOnce( 'purchase' );

	expect( purchase.event ).toBe( 'purchase_stape' );
	expect( purchase.ecommerce?.coupon ).toBe( coupon.code );
	// Pinned rather than computed: 10 % of 140.00 + 10 % of 40.00.
	expect( purchase.ecommerce?.discount_amount ).toBe( '18.00' );
} );

test( "purchase tax and shipping equal the order's tax and shipping totals @T70174e50", async ( {
	catalog,
	category,
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	storeOptions,
	testPlugins,
} ) => {
	// Prices exclusive of tax, the baseline's.
	await storeOptions( { calcTaxes: 'yes' } );
	await testPlugins.flatRateShipping( '5.00' );
	// In a tax class of its own, so it taxes this test's product only.
	const tax = await catalog.createTaxRate( { country: 'US', rate: '10' } );
	const product = await catalog.createProduct( category, { tax_class: tax.taxClass } );
	await homePage.addToCart( product, 2 );

	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	// The case's step 1: the checkout itself is taxed and shipped the way the
	// case expects, or 0.00 tax and shipping would mean a broken setup.
	await expect( checkoutPage.totalsAmount( 'Subtotal' ) ).toHaveText( '$40.00' );
	// The shipping line is labelled with the method's title.
	await expect( checkoutPage.totalsAmount( 'Flat rate' ) ).toHaveText( '$5.00' );
	await expect( checkoutPage.totalsAmount( tax.name ) ).toHaveText( '$4.00' );
	await expect( checkoutPage.totalsAmount( 'Total' ) ).toHaveText( '$49.00' );
	await checkoutPage.placeOrder();

	const purchase = await dataLayer.expectPushedOnce( 'purchase' );

	expect( purchase.event ).toBe( 'purchase_stape' );
	expect( purchase.ecommerce?.tax ).toBe( '4.00' );
	expect( purchase.ecommerce?.shipping ).toBe( '5.00' );
	// The order total, tax and shipping included: 40.00 + 4.00 + 5.00.
	expect( purchase.ecommerce?.value ).toBe( '49.00' );
} );

test( "An order created in wp-admin pushes no purchase on the admin's next front-end page @T3d64a13f", async ( {
	adminNewOrderPage,
	dataLayer,
	homePage,
	loginAsAdmin,
	orders,
	product,
	shopPage,
} ) => {
	await loginAsAdmin();
	await adminNewOrderPage.goto();
	await adminNewOrderPage.addProduct( product, 1 );
	await adminNewOrderPage.setStatus( 'Processing' );
	orders.deleteAfterTest( await adminNewOrderPage.create() );

	// purchase is printed in the footer, so a page that loaded has it if the
	// session held the order, and expectNotPushed() fails on a page without
	// the plugin's script. The shop below shows its grid as well.
	await homePage.goto();
	await dataLayer.expectNotPushed( 'purchase' );

	await shopPage.goto();
	expect( await shopPage.productNames() ).not.toEqual( [] );
	await dataLayer.expectNotPushed( 'purchase' );
} );

test( 'A failed or cancelled order pushes no purchase @Tafc26d1a', async ( {
	checkoutPage,
	dataLayer,
	guestBuyer,
	homePage,
	newSession,
	orderReceivedPage,
	orders,
	product,
	shopPage,
} ) => {
	await homePage.addToCart( product, 2 );
	const failed = await checkoutPage.placeOrderThroughStoreApi( guestBuyer );
	// Before any page is rendered in the buyer's session.
	await orders.setStatus( failed.id, 'failed' );

	await orderReceivedPage.goto( failed.receivedUrl );
	// The page found the order, so a missing push means the plugin skipped it.
	await expect( orderReceivedPage.failedHeading ).toBeVisible();
	await dataLayer.expectNotPushed( 'purchase' );
	await shopPage.goto();
	expect( await shopPage.productNames() ).not.toEqual( [] );
	await dataLayer.expectNotPushed( 'purchase' );

	// The same again in a new session, for a cancelled order.
	await newSession();
	await homePage.addToCart( product, 2 );
	const cancelled = await checkoutPage.placeOrderThroughStoreApi( guestBuyer );
	await orders.setStatus( cancelled.id, 'cancelled' );

	await orderReceivedPage.goto( cancelled.receivedUrl );
	await expect( orderReceivedPage.cancelledHeading ).toBeVisible();
	await dataLayer.expectNotPushed( 'purchase' );
	await shopPage.goto();
	expect( await shopPage.productNames() ).not.toEqual( [] );
	await dataLayer.expectNotPushed( 'purchase' );
} );

test( 'With gtm_server_side_is_order_confirmation_page returning true on a custom thank-you page, purchase is pushed there @T4abfaac0', async ( {
	catalog,
	checkoutPage,
	contentPage,
	dataLayer,
	guestBuyer,
	homePage,
	orderReceivedPage,
	product,
	testPlugins,
} ) => {
	const thanks = await catalog.createPage( 'Thank you' );
	await testPlugins.markOrderConfirmationPage( thanks );
	await homePage.addToCart( product, 2 );
	const order = await checkoutPage.placeOrderThroughStoreApi( guestBuyer );

	// On purpose: purchase waits for the confirmation page instead of firing
	// on whatever page renders first.
	await homePage.goto();

	await contentPage.goto( thanks );
	const purchase = await dataLayer.expectPushedOnce( 'purchase' );

	expect( purchase.event ).toBe( 'purchase_stape' );
	expect( purchase.ecommerce?.transaction_id ).toBe( String( order.id ) );
	// Pinned rather than computed: 2 x 20.00.
	expect( purchase.ecommerce?.value ).toBe( '40.00' );

	await orderReceivedPage.goto( order.receivedUrl );
	await expect( orderReceivedPage.heading ).toBeVisible();
	await dataLayer.expectNotPushed( 'purchase' );
} );
