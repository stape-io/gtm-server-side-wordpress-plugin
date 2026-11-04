import { expect, test } from '../../fixtures';

const SGTM_URL = 'https://sgtm.example.test';
const GTM_JS = 'https://www.googletagmanager.com/gtm.js?id=GTM-TESTID';

/** The consent script's own marker, and the GTM block's script it releases. */
const CONSENT_SCRIPT = 'gtmVariable:"dataLayer"';
const GATED_LOADER = '<script type="text/plain" id="custom-loader">';

/** The identifier snippet's loader URL for `abcdefgh`, `<PREFIX>` captured. */
const ABCDEFGH_LOADER = /j\.src="https:\/\/sgtm\.example\.test\/([A-Za-z0-9]{1,5})abcdefgh\.js\?"/;

/** The Fake API loader of the folder's fixtures, stored as a loader fetched from the Stape API. */
const API_LOADER = '<script>/*API-LOADER*/window.dataLayer=window.dataLayer||[];window.snipApiLoader=1;</script>';

test( 'In consent mode, GTM isn\'t loaded before a consent grant: the loader is `type="text/plain"` and no gtm.js request is made @T7e64098c', async ( {
	product,
	storeOptions,
	storefrontPage,
	dataLayer,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );

	await storefrontPage.goto( product.permalink );
	const source = await storefrontPage.source();
	expect( source.split( CONSENT_SCRIPT ) ).toHaveLength( 2 );
	expect( source.split( GATED_LOADER ) ).toHaveLength( 2 );
	const [ consentLine, loaderLine ] = [ CONSENT_SCRIPT, GATED_LOADER ].map(
		( search ) => source.slice( 0, source.indexOf( search ) ).split( '\n' ).length
	);
	expect( consentLine, `the consent script's line is above the GTM block's (line ${ loaderLine })` ).toBeLessThan( loaderLine );

	// The head's scripts are requested before the load event goto() waits for.
	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/plain' );
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).toEqual( [] );
} );

test( 'Granting ad_storage or analytics_storage with `consent default|update` loads GTM exactly once @T462779ac', async ( {
	product,
	storeOptions,
	storefrontPage,
	dataLayer,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );

	await storefrontPage.goto( product.permalink );
	await storefrontPage.gtag( 'consent', 'update', { analytics_storage: 'granted' } );
	// The released snippet inserts gtm.js within the push, but Playwright
	// reports the request to the test a moment later.
	await expect.poll( () => storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [ GTM_JS ] );
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/javascript' );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 1 );

	// A second release would run the snippet again within this push, so its
	// gtm.js entry would already be in the dataLayer.
	await storefrontPage.gtag( 'consent', 'update', { ad_storage: 'granted' } );
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/javascript' );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 1 );
	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [ GTM_JS ] );

	await storefrontPage.reload();
	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );
	await storefrontPage.pushToDataLayer( [ 'consent', 'default', { ad_storage: 'granted' } ] );
	await expect.poll( () => storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [ GTM_JS ] );
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/javascript' );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 1 );
} );

test( 'Denied consent doesn\'t load GTM @T92493895', async ( { product, storeOptions, storefrontPage, dataLayer } ) => {
	await storeOptions( { placement: 'gtm_consent' } );

	await storefrontPage.goto( product.permalink );
	// Still gated: the denial reached a page whose snippet waits for consent.
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/plain' );
	await storefrontPage.gtag( 'consent', 'update', { ad_storage: 'denied', analytics_storage: 'denied' } );

	// A release runs the snippet within the push, so it would show at once.
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/plain' );
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).toEqual( [] );
	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );
} );

test( 'Consent mode gates every snippet variant: the identifier, Cookie Keeper and API loader snippets are printed as `type="text/plain" id="custom-loader"` @Tfab91dac', async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	// Empty, as after the case's `wp transient delete`, and nobody else's.
	await loaderCache.isolate();
	await storeOptions( { placement: 'gtm_consent', webContainerUrl: SGTM_URL, webIdentifier: 'abcdefgh' } );

	await storefrontPage.goto( '/' );
	const identifier = await storefrontPage.source();
	expect( identifier.split( 'id="custom-loader"' ) ).toHaveLength( 2 );
	expect( identifier ).toContain( `${ GATED_LOADER }(function(w,d,s,l,i){w[l]=w[l]` );
	const [ , prefix ] = identifier.match( ABCDEFGH_LOADER ) ?? [];
	expect( prefix, 'j.src="https://sgtm.example.test/<PREFIX>abcdefgh.js?"' ).toBeDefined();
	expect( prefix ).not.toMatch( /(kp|gt)$/i );
	expect( storefrontPage.requestedUrls( 'sgtm.example.test' ) ).toEqual( [] );

	await storeOptions( { cookieKeeper: 'yes' } );
	await storefrontPage.reload();
	const cookieKeeper = await storefrontPage.source();
	expect( cookieKeeper.split( 'id="custom-loader"' ) ).toHaveLength( 2 );
	expect( cookieKeeper ).toContain( `${ GATED_LOADER }!function(){"use strict";funct` );
	expect( storefrontPage.requestedUrls( 'sgtm.example.test' ) ).toEqual( [] );

	await storeOptions( { customLoaderFromApi: API_LOADER } );
	await storefrontPage.reload();
	const apiLoader = await storefrontPage.source();
	// The plugin prints the stored loader on the consent script's line, so the
	// case's "the matching line starts" is read from the gated tag on.
	expect( apiLoader.split( 'id="custom-loader"' ) ).toHaveLength( 2 );
	expect( apiLoader ).toContain( `${ GATED_LOADER }/*API-LOADER*/window.dataLayer` );
	expect( await storefrontPage.windowValue( 'snipApiLoader' ) ).toBeUndefined();
} );

test( 'A grant of only ad_user_data, ad_personalization and functionality_storage doesn\'t load GTM @Tfc2e3bfd', async ( {
	product,
	storeOptions,
	storefrontPage,
	dataLayer,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );

	await storefrontPage.goto( product.permalink );
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/plain' );
	await storefrontPage.gtag( 'consent', 'update', {
		ad_user_data: 'granted',
		ad_personalization: 'granted',
		functionality_storage: 'granted',
	} );

	// A release runs the snippet within the push, so it would show at once.
	expect( await storefrontPage.scriptType( 'custom-loader' ) ).toBe( 'text/plain' );
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).toEqual( [] );
	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );
} );

test( 'A stored grant followed by a later denial doesn\'t load GTM @T83880b28', async ( {
	storeOptions,
	testPlugins,
	storefrontPage,
	dataLayer,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );
	await testPlugins.consentPlatform( 'granted-then-denied' );

	await storefrontPage.goto( '/' );
	const source = await storefrontPage.source();
	const searches = [ 'gtag("consent","default"', 'gtag("consent","update"', CONSENT_SCRIPT, 'id="custom-loader"' ];
	expect( searches.map( ( search ) => source.split( search ).length - 1 ) ).toEqual( [ 1, 1, 1, 1 ] );
	// The stand-in prints its default and update on one line, as the case's
	// does, so the order within that line counts too: by position.
	const positions = searches.map( ( search ) => source.indexOf( search ) );
	expect( positions, `positions of ${ searches.join( ', ' ) }` ).toEqual( [ ...positions ].sort( ( a, b ) => a - b ) );

	expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 0 );
} );
