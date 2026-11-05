import { expect, test } from '../../fixtures';

const GTM_START = '<!-- Google Tag Manager -->';
const CONSENT_SCRIPT = 'gtmVariable:"dataLayer"';

/** The cases' setting: "Exclude GTM for user roles" on, for editors. */
const EXCLUDE_EDITORS = { excludeRoles: 'yes' as const, excludedRoles: [ 'editor' ] };

/** A new `_sbp`, as `curl -D -` prints it after `Set-Cookie: `, with its expiry captured. */
const SBP_SET =
	/^_sbp=[0-9a-f]{32}; expires=(\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2}) GMT; Max-Age=63072000; path=\/; domain=\.localhost; secure; SameSite=lax$/;

/**
 * Without a snippet nothing creates window.dataLayer, so the plugin's
 * server-rendered pushes throw for an excluded user. The cases list that under
 * "Not covered here"; the known-defect case 0e751329 is about it.
 */
const DEV_12902 = [ { message: 'dataLayer is not defined', ticket: 'DEV-12902' } ];

const TWO_YEARS_MS = 63072000 * 1000;
/** Slack for the clocks of the test and the server, and the request's own time. */
const CLOCK_SLACK_MS = 60 * 1000;

test.describe( () => {
	test.use( { knownPageErrors: DEV_12902 } );

	test( 'A logged-in user with an excluded role gets no GTM snippet @Tbf7fbd2b', async ( {
		product,
		catalog,
		storeOptions,
		myAccountPage,
		storefrontPage,
	} ) => {
		await storeOptions( EXCLUDE_EDITORS );
		const editor = await catalog.createCustomer( { roles: [ 'editor' ] } );
		await myAccountPage.goto();
		await myAccountPage.logIn( editor );

		await storefrontPage.goto( product.permalink );
		let source = await storefrontPage.source();
		// A page that broke prints no snippet either: the plugin's footer
		// config shows it rendered to the end.
		expect( source ).toContain( 'varGtmServerSide' );
		expect( source ).not.toContain( GTM_START );
		expect( source ).not.toContain( CONSENT_SCRIPT );
		expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );

		await storeOptions( { placement: 'gtm_consent' } );
		await storefrontPage.goto( product.permalink );
		source = await storefrontPage.source();
		expect( source ).toContain( 'varGtmServerSide' );
		expect( source ).not.toContain( GTM_START );
		expect( source ).not.toContain( CONSENT_SCRIPT );
	} );
} );

test( 'Guests and logged-in users without an excluded role still get the snippet @Tb86538dd', async ( {
	product,
	catalog,
	storeOptions,
	newSession,
	loginAsAdmin,
	myAccountPage,
	storefrontPage,
} ) => {
	await storeOptions( EXCLUDE_EDITORS );
	await storefrontPage.goto( product.permalink );
	expect( ( await storefrontPage.source() ).split( GTM_START ), 'GTM blocks for the guest' ).toHaveLength( 2 );

	await newSession();
	await storeOptions( EXCLUDE_EDITORS );
	const customer = await catalog.createCustomer();
	await myAccountPage.goto();
	await myAccountPage.logIn( customer );
	await storefrontPage.goto( product.permalink );
	expect( ( await storefrontPage.source() ).split( GTM_START ), 'GTM blocks for the customer' ).toHaveLength( 2 );

	await newSession();
	await storeOptions( EXCLUDE_EDITORS );
	await loginAsAdmin();
	// A guest gets the snippet too: show the store sees the admin logged in.
	await myAccountPage.expectLoggedIn();
	await storefrontPage.goto( product.permalink );
	expect( ( await storefrontPage.source() ).split( GTM_START ), 'GTM blocks for the admin' ).toHaveLength( 2 );
} );

test.describe( () => {
	test.use( { knownPageErrors: DEV_12902 } );

	test( 'A user with several roles is excluded when any of them is excluded @T3c4935b8', async ( {
		product,
		catalog,
		storeOptions,
		myAccountPage,
		storefrontPage,
	} ) => {
		await storeOptions( EXCLUDE_EDITORS );
		const multi = await catalog.createCustomer( { roles: [ 'customer', 'editor' ] } );
		await myAccountPage.goto();
		await myAccountPage.logIn( multi );

		await storefrontPage.goto( product.permalink );
		const source = await storefrontPage.source();
		expect( source ).toContain( 'varGtmServerSide' );
		expect( source ).not.toContain( GTM_START );
	} );
} );

test( 'With "Exclude GTM for user roles" unchecked, a user with a listed role gets the snippet @T0e9915b4', async ( {
	product,
	catalog,
	storeOptions,
	myAccountPage,
	storefrontPage,
} ) => {
	await storeOptions( { excludeRoles: '', excludedRoles: [ 'editor' ] } );
	const editor = await catalog.createCustomer( { roles: [ 'editor' ] } );
	await myAccountPage.goto();
	await myAccountPage.logIn( editor );

	await storefrontPage.goto( product.permalink );
	expect( ( await storefrontPage.source() ).split( GTM_START ) ).toHaveLength( 2 );
} );

test.describe( () => {
	test.use( { knownPageErrors: DEV_12902 } );

	test( 'An excluded user still receives the `_sbp` Cookie Keeper cookie @Tfefbbf9f', async ( {
		product,
		catalog,
		loaderCache,
		storeOptions,
		newSession,
		myAccountPage,
		storefrontPage,
	} ) => {
		const settings = {
			...EXCLUDE_EDITORS,
			webContainerUrl: 'https://sgtm.example.test',
			webIdentifier: 'abcdefgh',
		};
		await loaderCache.isolate();
		await storeOptions( settings );
		const editor = await catalog.createCustomer( { roles: [ 'editor' ] } );
		// Logged in before Cookie Keeper is on, as in the case: with it on, the
		// login response would already set `_sbp`.
		await myAccountPage.goto();
		await myAccountPage.logIn( editor );
		expect( await storefrontPage.cookie( '_sbp' ) ).toBeUndefined();

		await storeOptions( { cookieKeeper: 'yes' } );
		const sent = Date.now();
		await storefrontPage.goto( product.permalink );
		const received = Date.now();
		const headers = await storefrontPage.setCookieHeaders( '_sbp' );
		expect( headers ).toHaveLength( 1 );
		expect( headers[ 0 ] ).toMatch( SBP_SET );
		const [ , expires ] = headers[ 0 ].match( SBP_SET ) ?? [];
		const sentExpiry = Date.parse( `${ expires } GMT` );
		expect( sentExpiry ).toBeGreaterThan( sent + TWO_YEARS_MS - CLOCK_SLACK_MS );
		expect( sentExpiry ).toBeLessThan( received + TWO_YEARS_MS + CLOCK_SLACK_MS );

		await newSession();
		await loaderCache.isolate();
		await storeOptions( { ...settings, cookieKeeper: 'yes' } );
		await myAccountPage.goto();
		await myAccountPage.logIn( editor );
		await storefrontPage.goto( product.permalink );
		const source = await storefrontPage.source();
		expect( source ).toContain( 'varGtmServerSide' );
		expect( source ).not.toContain( GTM_START );
	} );
} );
