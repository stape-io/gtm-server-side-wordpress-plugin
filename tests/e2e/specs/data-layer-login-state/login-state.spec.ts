import { expect, test } from '../../fixtures';

/**
 * login_state is an entry of its own with no `event`, printed in wp_head
 * ahead of every loader, so GTM has it before gtm.js and every event after.
 */

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet
test( 'A logged-out visitor gets one login_state "logged-out" entry, pushed before gtm.js', async ( {
	homePage,
	dataLayer,
} ) => {
	await homePage.goto();

	const entries = await dataLayer.entries();
	const loginStates = entries.filter( ( entry ) => 'login_state' in entry );
	expect( loginStates ).toEqual( [ { login_state: 'logged-out' } ] );

	const loginStateAt = entries.findIndex( ( entry ) => 'login_state' in entry );
	const gtmJsAt = entries.findIndex( ( entry ) => entry.event === 'gtm.js' );
	expect( gtmJsAt, 'the GTM snippet pushed gtm.js' ).toBeGreaterThanOrEqual( 0 );
	expect( loginStateAt, 'login_state comes before gtm.js' ).toBeLessThan( gtmJsAt );
} );

// eslint-disable-next-line playwright/valid-title -- no Testomat case yet
test( 'A logged-in customer gets login_state "logged-in", with user data off', async ( {
	myAccountPage,
	homePage,
	dataLayer,
	catalog,
} ) => {
	const customer = await catalog.createCustomer();
	await myAccountPage.goto();
	await myAccountPage.logIn( customer );

	await homePage.goto();

	const entries = await dataLayer.entries();
	expect( entries.filter( ( entry ) => 'login_state' in entry ) ).toEqual( [ { login_state: 'logged-in' } ] );
	// Baseline store: "Add user data" is off, so the state does not come from it.
	expect( await dataLayer.entriesWith( 'user_data' ) ).toEqual( [] );
} );
