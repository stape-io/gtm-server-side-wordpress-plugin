import { expect, test } from '../../fixtures';
import { expectedOrderUserData, expectedUserData } from '../../data-layer/expected';

test( "With user data on, a logged-in customer's events carry user_data with profile and billing fields, empty fields omitted @Tbde21463", async ( {
	storeOptions,
	myAccountPage,
	productPage,
	dataLayer,
	catalog,
	product,
} ) => {
	const customer = await catalog.createCustomer();
	await storeOptions( { userData: 'yes' } );
	await myAccountPage.goto();
	await myAccountPage.logIn( customer );

	await productPage.goto( product );
	const viewItem = await dataLayer.expectPushedOnce( 'view_item' );
	// Spelled out rather than resolved, so a dropped suffix fails here.
	expect( viewItem.event ).toBe( 'view_item_stape' );

	// The whole object: no shipping_* or other empty keys, and every value a
	// string, customer_id included.
	expect( viewItem.user_data ).toEqual( expectedUserData( customer ) );
	expect( ( await dataLayer.pluginConfig() ).user_data ).toEqual( viewItem.user_data );
} );

test( 'With user data off, no event carries user_data, even for a logged-in customer @T4e729faf', async ( {
	myAccountPage,
	productPage,
	categoryPage,
	cartPage,
	checkoutPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const subcategory = await catalog.createCategory( category );
	const product = await catalog.createProduct( subcategory );
	const customer = await catalog.createCustomer();
	await myAccountPage.goto();
	await myAccountPage.logIn( customer );

	await productPage.goto( product );
	expect( ( await dataLayer.expectPushedOnce( 'view_item' ) ).event ).toBe( 'view_item_stape' );
	expect( await dataLayer.entriesWith( 'user_data' ) ).toEqual( [] );
	expect( ( await dataLayer.pluginConfig() ).user_data ).toBeUndefined();

	await categoryPage.goto( subcategory );
	expect( ( await dataLayer.expectPushedOnce( 'view_item_list' ) ).event ).toBe( 'view_item_list_stape' );
	expect( await dataLayer.entriesWith( 'user_data' ) ).toEqual( [] );
	expect( ( await dataLayer.pluginConfig() ).user_data ).toBeUndefined();

	await categoryPage.addToCart( product.name );
	// The case's 3 seconds, so the click's later pushes are in too.
	expect( ( await dataLayer.expectPushedOnce( 'select_item', { quietMs: 3_000 } ) ).event ).toBe(
		'select_item_stape'
	);
	expect( await dataLayer.entriesWith( 'user_data' ) ).toEqual( [] );

	await cartPage.goto();
	expect( ( await dataLayer.expectPushedOnce( 'view_cart' ) ).event ).toBe( 'view_cart_stape' );
	expect( await dataLayer.entriesWith( 'user_data' ) ).toEqual( [] );

	await checkoutPage.goto();
	expect( ( await dataLayer.expectPushedOnce( 'begin_checkout' ) ).event ).toBe( 'begin_checkout_stape' );
	expect( await dataLayer.entriesWith( 'user_data' ) ).toEqual( [] );

	// The checkout shows the account's billing address, which is the case's.
	await checkoutPage.placeOrder();
	expect( ( await dataLayer.expectPushedOnce( 'purchase' ) ).event ).toBe( 'purchase_stape' );
	expect( await dataLayer.entriesWith( 'user_data' ) ).toEqual( [] );
} );

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

/** The grid's JS pushes copy varGtmServerSide.user_data (assets/js/javascript.js). */
test( 'JS-pushed events carry the same user_data as the page @T9a7b0646', async ( {
	storeOptions,
	myAccountPage,
	categoryPage,
	dataLayer,
	catalog,
	category,
} ) => {
	const subcategory = await catalog.createCategory( category );
	const product = await catalog.createProduct( subcategory );
	const customer = await catalog.createCustomer();
	await storeOptions( { userData: 'yes' } );
	await myAccountPage.goto();
	await myAccountPage.logIn( customer );

	await categoryPage.goto( subcategory );
	const viewItemList = await dataLayer.expectPushedOnce( 'view_item_list' );
	// Waits for the click's last request too: the customer is deleted after
	// the test, and a request still on its way would then fail.
	await categoryPage.addToCartUntilCartState( product.name );
	const selectItem = await dataLayer.expectPushedOnce( 'select_item' );
	expect( viewItemList.event ).toBe( 'view_item_list_stape' );
	expect( selectItem.event ).toBe( 'select_item_stape' );

	expect( selectItem.user_data ).toEqual( viewItemList.user_data );
	expect( selectItem.user_data ).toEqual( ( await dataLayer.pluginConfig() ).user_data );
	expect( selectItem.user_data ).toEqual( expectedUserData( customer ) );
} );

test( 'A registered customer\'s first order pushes purchase with order billing/shipping in user_data and new_customer "true" @T4a1b1e54', async ( {
	storeOptions,
	myAccountPage,
	homePage,
	checkoutPage,
	dataLayer,
	catalog,
	product,
	guestBuyer,
} ) => {
	const customer = await catalog.createCustomer();
	await storeOptions( { userData: 'yes' } );
	await myAccountPage.goto();
	await myAccountPage.logIn( customer );
	await homePage.addToCart( product );

	await checkoutPage.goto();
	// Unlike the account's email on purpose; the address stays the account's.
	await checkoutPage.fillContactEmail( guestBuyer.email );
	await checkoutPage.placeOrder();

	const purchase = await dataLayer.expectPushedOnce( 'purchase' );
	expect( purchase.event ).toBe( 'purchase_stape' );
	expect( purchase.user_data ).toEqual(
		expectedOrderUserData( customer, { billingEmail: guestBuyer.email, newCustomer: 'true' } )
	);
} );

test( 'A registered customer\'s second order pushes purchase with new_customer "false" @T4270f7ba', async ( {
	storeOptions,
	myAccountPage,
	homePage,
	checkoutPage,
	dataLayer,
	catalog,
	product,
	guestBuyer,
} ) => {
	const customer = await catalog.createCustomer();
	await storeOptions( { userData: 'yes' } );
	await myAccountPage.goto();
	await myAccountPage.logIn( customer );

	// The first order, as in the first-order case.
	await homePage.addToCart( product );
	await checkoutPage.goto();
	await checkoutPage.fillContactEmail( guestBuyer.email );
	await checkoutPage.placeOrder();
	await dataLayer.expectPushedOnce( 'purchase' );

	await homePage.addToCart( product );
	await checkoutPage.goto();
	await checkoutPage.fillContactEmail( guestBuyer.email );
	await checkoutPage.placeOrder();

	const purchase = await dataLayer.expectPushedOnce( 'purchase' );
	expect( purchase.event ).toBe( 'purchase_stape' );
	expect( purchase.user_data ).toEqual(
		expectedOrderUserData( customer, { billingEmail: guestBuyer.email, newCustomer: 'false' } )
	);
} );

test( "With user data on, sign_up after My Account registration carries the new customer's user_data @Tcfba9598", async ( {
	storeOptions,
	myAccountPage,
	dataLayer,
	newCustomer,
} ) => {
	await storeOptions( { userData: 'yes', myAccountRegistration: 'yes' } );

	await myAccountPage.goto();
	await myAccountPage.register( newCustomer.email );

	const { event, user_data: userData } = await dataLayer.expectPushedOnce( 'sign_up' );
	expect( event ).toBe( 'sign_up_stape' );
	expect( Array.isArray( userData ), 'user_data is an object, not []' ).toBe( false );
	// The case covers these two fields only: the rest is what WooCommerce
	// stores at registration.
	expect( userData ).toMatchObject( {
		customer_id: String( await newCustomer.accountId() ),
		email: newCustomer.email,
	} );
	const values = Object.values( userData ?? {} );
	expect( values ).toEqual( values.map( () => expect.stringMatching( /\S/ ) ) );
} );
