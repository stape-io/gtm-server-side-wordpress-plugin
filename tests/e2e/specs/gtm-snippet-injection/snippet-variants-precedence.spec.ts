import { expect, test } from '../../fixtures';

const SGTM_URL = 'https://sgtm.example.test';
const GTM_START = '<!-- Google Tag Manager -->';

/** `id=GTM-TESTID` and `id=GTM-OTHER1`, base64-encoded and URL-encoded, as the cases give them. */
const ENCODED_TESTID = 'aWQ9R1RNLVRFU1RJRA%3D%3D';
const ENCODED_OTHER1 = 'aWQ9R1RNLU9USEVSMQ%3D%3D';

/**
 * The identifier snippet's loader URL for `abcdefgh`, `<PREFIX>` captured:
 * 1-5 letters or digits (that it doesn't end in `kp` or `gt` is checked apart).
 */
const ABCDEFGH_LOADER = /j\.src="https:\/\/sgtm\.example\.test\/([A-Za-z0-9]{1,5})abcdefgh\.js\?"/;

/** The same for the identifier case 0d32d39a saves, `zyxwvuts`. */
const ZYXWVUTS_LOADER = /j\.src="https:\/\/sgtm\.example\.test\/([A-Za-z0-9]{1,5})zyxwvuts\.js\?"/;

/**
 * The identifier snippet's container argument for GTM-TESTID and `abcdefgh`:
 * the whole argument, `<R>` and `<E>` captured. `<E>`'s `type=` is the first 8
 * hex characters of md5( 'abcdefgh' ). The separator is `&amp;` today, which
 * the case leaves out ("Not covered here"), so `&` passes too.
 */
const ABCDEFGH_CONTAINER_ARGUMENT = new RegExp(
	`'dataLayer','(([A-Za-z0-9]{1,8})=${ ENCODED_TESTID }(?:&amp;|&)(cgm=nmB|asq=2|tl=dr|type=e8dc4081|sort=asc|sort=desc))'\\);</script>`
);

/** The Fake API loader of the folder's fixtures, stored as a loader fetched from the Stape API. */
const API_LOADER = '<script>/*API-LOADER*/window.dataLayer=window.dataLayer||[];window.snipApiLoader=1;</script>';

test( 'With an sGTM URL and no identifier, the default snippet loads `gtm.js?id=GTM-TESTID` from the sGTM URL @T54396725', async ( {
	product,
	storeOptions,
	storefrontPage,
	dataLayer,
} ) => {
	await storeOptions( { webContainerUrl: SGTM_URL } );

	await storefrontPage.goto( product.permalink );
	const source = await storefrontPage.source();
	expect( source ).toContain( "'https://sgtm.example.test/gtm.js?id='+i+dl" );
	expect( source ).toContain( "(window,document,'script','dataLayer','GTM-TESTID');</script>" );

	// The stubGtm fixture answers the sGTM host, which doesn't resolve: the
	// request itself is what the case checks.
	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [ 'https://sgtm.example.test/gtm.js?id=GTM-TESTID' ] );
	expect( storefrontPage.requestedUrls( 'www.googletagmanager.com' ) ).toEqual( [] );

	expect( await dataLayer.entriesWith( 'gtm.start' ) ).toHaveLength( 1 );
} );

test( 'With an identifier and an sGTM URL, the snippet loads `<sGTM URL>/<prefix><identifier>.js` with the Web GTM ID base64-encoded in the first query parameter @Tc6f4f784', async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
	dataLayer,
} ) => {
	// Empty, as after the case's `wp transient delete`, and nobody else's.
	await loaderCache.isolate();
	await storeOptions( { webContainerUrl: SGTM_URL, webIdentifier: 'abcdefgh' } );

	await storefrontPage.goto( '/' );
	const source = await storefrontPage.source();
	const [ , prefix ] = source.match( ABCDEFGH_LOADER ) ?? [];
	expect( prefix, 'j.src="https://sgtm.example.test/<PREFIX>abcdefgh.js?"' ).toBeDefined();
	expect( prefix ).not.toMatch( /(kp|gt)$/i );
	expect( source ).not.toContain( 'gtm.js?id=' );
	expect( source ).not.toContain( 'www.googletagmanager.com' );
	const [ , argument, r, e ] = source.match( ABCDEFGH_CONTAINER_ARGUMENT ) ?? [];
	expect( argument, "'dataLayer','<R>=aWQ9R1RNLVRFU1RJRA%3D%3D<separator><E>'" ).toBeDefined();
	expect( Buffer.from( decodeURIComponent( ENCODED_TESTID ), 'base64' ).toString() ).toBe( 'id=GTM-TESTID' );

	expect( await loaderCache.read() ).toEqual( {
		identifier: `${ prefix }abcdefgh`,
		containerId: `${ r }=${ ENCODED_TESTID }&${ e }`,
	} );

	expect( storefrontPage.requestedUrls( 'abcdefgh' ) ).toEqual( [ `${ SGTM_URL }/${ prefix }abcdefgh.js?${ argument }` ] );
	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );
	expect( storefrontPage.requestedUrls( 'www.googletagmanager.com' ) ).toEqual( [] );

	expect( await dataLayer.entriesWith( 'gtm.start' ) ).toHaveLength( 1 );
} );

test( 'The identifier prefix and encoded Web GTM ID stay the same on every page view until the settings change @T6d9b5ee7', async ( {
	product,
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	await loaderCache.isolate();
	await storeOptions( { webContainerUrl: SGTM_URL, webIdentifier: 'abcdefgh' } );

	// The shop opened, then reloaded three times.
	const views: Array< { path: string; loader?: string; argument?: string } > = [];
	for ( const path of [ '/', '/shop/', '/shop/', '/shop/', '/shop/', product.permalink ] ) {
		await storefrontPage.goto( path );
		const source = await storefrontPage.source();
		views.push( {
			path,
			loader: source.match( ABCDEFGH_LOADER )?.[ 0 ],
			argument: source.match( ABCDEFGH_CONTAINER_ARGUMENT )?.[ 1 ],
		} );
	}
	const [ first ] = views;
	expect( first.loader, 'j.src="https://sgtm.example.test/<PREFIX>abcdefgh.js?" on /' ).toBeDefined();
	expect( first.argument, 'the container argument on /' ).toBeDefined();
	expect( views ).toEqual( views.map( ( { path } ) => ( { ...first, path } ) ) );

	const [ , prefix ] = first.loader?.match( ABCDEFGH_LOADER ) ?? [];
	expect( prefix ).not.toMatch( /(kp|gt)$/i );
	for ( let load = 0; load < 2; load++ ) {
		await storefrontPage.goto( '/shop/' );
		expect( storefrontPage.requestedUrls( 'abcdefgh' ), `load ${ load + 1 } of /shop/` ).toEqual( [
			`${ SGTM_URL }/${ prefix }abcdefgh.js?${ first.argument }`,
		] );
	}
} );

test( 'Saving a new identifier or Web GTM ID in wp-admin changes the loader URL on the next page view @T0d32d39a', { tag: '@serial' }, async ( {
	loginAsAdmin,
	newSession,
	adminSettingsPage,
	loaderCache,
	storefrontPage,
} ) => {
	// The preconditions, saved where the case's WP-CLI writes them. The case's
	// baseline has the same-origin proxy off; the e2e store keeps it half set
	// up, and the tab hides the sGTM URL and identifier while it is on.
	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.setSameOriginProxy( false );
	await adminSettingsPage.webContainerUrlInput.fill( SGTM_URL );
	await adminSettingsPage.webIdentifierInput.fill( 'abcdefgh' );
	await adminSettingsPage.save();
	await loaderCache.clear();
	// Step 1 opens the page before the case logs in.
	await newSession();

	await storefrontPage.goto( '/' );
	const before = await storefrontPage.source();
	expect( before ).toMatch( ABCDEFGH_LOADER );
	expect( before ).toMatch( ABCDEFGH_CONTAINER_ARGUMENT );

	await loginAsAdmin();
	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.webIdentifierInput.fill( 'zyxwvuts' );
	await adminSettingsPage.save();
	await expect( adminSettingsPage.savedNotice ).toBeVisible();

	expect( await loaderCache.read() ).toEqual( { identifier: null, containerId: null } );

	await storefrontPage.goto( '/' );
	const newIdentifier = await storefrontPage.source();
	const [ , newPrefix ] = newIdentifier.match( ZYXWVUTS_LOADER ) ?? [];
	expect( newPrefix, 'j.src="https://sgtm.example.test/<PREFIX>zyxwvuts.js?"' ).toBeDefined();
	expect( newPrefix ).not.toMatch( /(kp|gt)$/i );
	expect( newIdentifier ).not.toContain( 'abcdefgh' );
	expect( newIdentifier ).toMatch( new RegExp( `'dataLayer','[A-Za-z0-9]{1,8}=${ ENCODED_TESTID }` ) );

	await adminSettingsPage.goto( 'general' );
	await adminSettingsPage.webContainerIdInput.fill( 'GTM-OTHER1' );
	await adminSettingsPage.save();
	await expect( adminSettingsPage.savedNotice ).toBeVisible();

	await storefrontPage.goto( '/' );
	const newContainerId = await storefrontPage.source();
	expect( newContainerId ).toMatch( new RegExp( `'dataLayer','[A-Za-z0-9]{1,8}=${ ENCODED_OTHER1 }` ) );
	expect( Buffer.from( decodeURIComponent( ENCODED_OTHER1 ), 'base64' ).toString() ).toBe( 'id=GTM-OTHER1' );
	expect( newContainerId ).not.toContain( ENCODED_TESTID );
	expect( newContainerId ).toMatch( ZYXWVUTS_LOADER );
} );

test( 'A stored API loader is printed instead of the Cookie Keeper, identifier or default snippet @Ted988bf6', async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	await storeOptions( { customLoaderFromApi: API_LOADER } );

	await storefrontPage.goto( '/' );
	const defaultSettings = await storefrontPage.source();
	expect( defaultSettings.split( '/*API-LOADER*/' ) ).toHaveLength( 2 );
	expect( defaultSettings ).toContain( API_LOADER );
	expect( defaultSettings ).not.toContain( GTM_START );
	expect( defaultSettings ).not.toContain( 'gtm.start' );

	expect( await storefrontPage.windowValue( 'snipApiLoader' ) ).toBe( 1 );

	// Were the identifier snippet printed after all, its cache stays this test's.
	await loaderCache.isolate();
	await storeOptions( { webContainerUrl: SGTM_URL, webIdentifier: 'abcdefgh', cookieKeeper: 'yes' } );

	await storefrontPage.goto( '/' );
	const everySnippetSet = await storefrontPage.source();
	expect( everySnippetSet.split( '/*API-LOADER*/' ) ).toHaveLength( 2 );
	expect( everySnippetSet ).toContain( API_LOADER );
	expect( everySnippetSet ).not.toContain( GTM_START );
	expect( everySnippetSet ).not.toContain( 'gtm.start' );
} );
