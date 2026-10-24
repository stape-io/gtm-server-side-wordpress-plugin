import { expect, test } from '../../fixtures';

/** The cookie user_register() sets for the next page, which prints sign_up and deletes it. */
const SIGN_UP_COOKIE = 'gtm_server_side_register';

test( 'Registering on My Account pushes one sign_up on the next page @Tfad93be5', async ( {
	storeOptions,
	myAccountPage,
	dataLayer,
	newCustomer,
} ) => {
	await storeOptions( { myAccountRegistration: 'yes' } );

	await myAccountPage.goto();
	await myAccountPage.register( newCustomer.email );

	const signUp = await dataLayer.expectPushedOnce( 'sign_up' );
	// Spelled out: the event carries no fixture data to build it from, and
	// user_data is off on the baseline store.
	expect( signUp ).toEqual( { event: 'sign_up_stape' } );
} );

test( 'After sign_up is shown, the flag cookie is deleted and the next page pushes no sign_up @Tf9bbd816', async ( {
	storeOptions,
	myAccountPage,
	shopPage,
	dataLayer,
	newCustomer,
} ) => {
	await storeOptions( { myAccountRegistration: 'yes' } );

	await myAccountPage.goto();
	await myAccountPage.register( newCustomer.email );
	await dataLayer.expectPushedOnce( 'sign_up' );

	expect( await myAccountPage.source() ).toContain(
		`document.cookie = '${ SIGN_UP_COOKIE }=; max-age=-1; path=/; domain=.localhost;';`
	);
	expect( await myAccountPage.cookieNames() ).not.toContain( SIGN_UP_COOKIE );

	await shopPage.goto();
	// sign_up is printed in wp_footer, before the footer scripts that carry
	// varGtmServerSide, which expectNotPushed() requires: the shop's footer
	// rendered, whatever its grid holds.
	await dataLayer.expectNotPushed( 'sign_up' );
} );

test( 'Creating an account during checkout pushes sign_up on order-received next to purchase @Tacf00a73', async ( {
	storeOptions,
	homePage,
	checkoutPage,
	dataLayer,
	guestBuyer,
	product,
} ) => {
	await storeOptions( { checkoutSignup: 'yes' } );

	await homePage.addToCart( product );
	await checkoutPage.goto();
	await checkoutPage.fillBillingDetails( guestBuyer );
	await checkoutPage.createAccount();
	await checkoutPage.placeOrder();

	// The case is about both events on one page, not their payloads (the
	// purchase suite has those): only the names it gives are spelled out.
	expect( ( await dataLayer.expectPushedOnce( 'sign_up' ) ).event ).toBe( 'sign_up_stape' );
	expect( ( await dataLayer.expectPushedOnce( 'purchase' ) ).event ).toBe( 'purchase_stape' );
} );
