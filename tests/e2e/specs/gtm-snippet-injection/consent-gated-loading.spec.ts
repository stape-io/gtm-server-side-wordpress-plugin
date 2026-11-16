import { expect, test } from '../../fixtures';

const GTM_JS = 'https://www.googletagmanager.com/gtm.js?id=GTM-TESTID';

test( 'Granting ad_storage or analytics_storage with `consent default|update` loads GTM exactly once @T462779ac', async ( {
	storeOptions,
	productPage,
	gtmLoader,
	dataLayer,
	product,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );

	await productPage.goto( product );
	await gtmLoader.gtag( 'consent', 'update', { analytics_storage: 'granted' } );
	await expect.poll( () => gtmLoader.gtmJsRequests() ).toEqual( [ GTM_JS ] );
	expect( await gtmLoader.loaderType() ).toBe( 'text/javascript' );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 1 );

	await gtmLoader.gtag( 'consent', 'update', { ad_storage: 'granted' } );
	expect( await gtmLoader.loaderType() ).toBe( 'text/javascript' );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 1 );
	expect( gtmLoader.gtmJsRequests(), 'the second grant requests no second gtm.js' ).toEqual( [ GTM_JS ] );

	const firstPageView = gtmLoader.gtmJsRequests().length;
	await productPage.goto( product );
	await gtmLoader.pushArray( [ 'consent', 'default', { ad_storage: 'granted' } ] );
	await expect.poll( () => gtmLoader.gtmJsRequests().slice( firstPageView ) ).toEqual( [ GTM_JS ] );
	expect( await gtmLoader.loaderType() ).toBe( 'text/javascript' );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 1 );
} );

test( 'Denied consent doesn\'t load GTM @T92493895', async ( { storeOptions, productPage, gtmLoader, dataLayer, product } ) => {
	await storeOptions( { placement: 'gtm_consent' } );

	await productPage.goto( product );
	await gtmLoader.gtag( 'consent', 'update', { ad_storage: 'denied', analytics_storage: 'denied' } );

	// The release is synchronous with the push, so a gtm.start entry would be
	// there already; the request list then backs it up.
	expect( await gtmLoader.loaderType() ).toBe( 'text/plain' );
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).toEqual( [] );
	expect( gtmLoader.gtmJsRequests() ).toEqual( [] );
} );

test( 'Consent already granted before the plugin\'s consent script (a returning visitor) loads GTM on page load @T40acfaaa', async ( {
	storeOptions,
	testPlugins,
	productPage,
	gtmLoader,
	dataLayer,
	product,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );
	await testPlugins.cmpStandIn( 'granted' );

	await productPage.goto( product );
	const source = await productPage.source();
	const markers = [ 'gtag("consent","default"', 'gtmVariable:"dataLayer"', 'id="custom-loader"' ];
	expect( markers.map( ( marker ) => source.split( marker ).length - 1 ), 'each search finds one match' ).toEqual( [ 1, 1, 1 ] );
	const lines = markers.map( ( marker ) => source.indexOf( marker ) );
	expect( lines, 'the grant comes before the consent script, and that before the loader' ).toEqual( [ ...lines ].sort( ( a, b ) => a - b ) );

	await expect.poll( () => gtmLoader.gtmJsRequests() ).toEqual( [ GTM_JS ] );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 1 );
} );

test( 'A grant of only ad_user_data, ad_personalization and functionality_storage doesn\'t load GTM @Tfc2e3bfd', async ( {
	storeOptions,
	productPage,
	gtmLoader,
	dataLayer,
	product,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );

	await productPage.goto( product );
	await gtmLoader.gtag( 'consent', 'update', {
		ad_user_data: 'granted',
		ad_personalization: 'granted',
		functionality_storage: 'granted',
	} );

	expect( await gtmLoader.loaderType() ).toBe( 'text/plain' );
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).toEqual( [] );
	expect( gtmLoader.gtmJsRequests() ).toEqual( [] );
} );

test( 'A stored grant followed by a later denial doesn\'t load GTM @T83880b28', async ( {
	storeOptions,
	testPlugins,
	homePage,
	gtmLoader,
	dataLayer,
} ) => {
	await storeOptions( { placement: 'gtm_consent' } );
	await testPlugins.cmpStandIn( 'granted-denied' );

	// goto() waits for the load event, which waits for a gtm.js the consent
	// script released while the page was parsing.
	await homePage.goto();
	const source = await homePage.source();
	const markers = [ 'gtag("consent","default"', 'gtag("consent","update"', 'gtmVariable:"dataLayer"', 'id="custom-loader"' ];
	expect( markers.map( ( marker ) => source.split( marker ).length - 1 ), 'each search finds one match' ).toEqual( [ 1, 1, 1, 1 ] );
	const lines = markers.map( ( marker ) => source.indexOf( marker ) );
	expect( lines, 'the grant and the denial come before the consent script, and that before the loader' ).toEqual(
		[ ...lines ].sort( ( a, b ) => a - b )
	);

	expect( gtmLoader.gtmJsRequests() ).toEqual( [] );
	expect( ( await dataLayer.entries() ).filter( ( entry ) => entry.event === 'gtm.js' ) ).toHaveLength( 0 );
} );
