import { expect, test } from '../fixtures';

/**
 * get_data_layer_user_data() in includes/class-gtm-server-side-wc-helpers.php
 * builds user_data from the logged-in customer. A guest has none, so it
 * comes out as an empty array, even once the checkout holds their details.
 */
test( "With user data on, a guest's non-purchase events carry user_data: [] @T1fb7572c", async ( {
	storeOptions,
	productPage,
	checkoutPage,
	dataLayer,
	product,
	guestBuyer,
} ) => {
	await storeOptions( { userData: 'yes' } );

	await productPage.goto( product );
	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );
	expect( viewItem.user_data ).toEqual( [] );
	expect( ( await dataLayer.pluginConfig() ).user_data ).toEqual( [] );

	await productPage.addToCart();
	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.reload();

	const beginCheckout = await dataLayer.expectPushedOnce( 'begin_checkout' );
	expect( beginCheckout.user_data ).toEqual( [] );
} );
