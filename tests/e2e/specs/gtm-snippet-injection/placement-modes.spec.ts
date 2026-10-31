import { expect, test } from '../../fixtures';

const GTM_START = '<!-- Google Tag Manager -->';
const GTM_END = '<!-- End Google Tag Manager -->';

test( '"Add web GTM script onto every page" prints the default GTM snippet exactly once in the page head on every storefront page type @Tbb2a0460', async ( {
	product,
	storefrontPage,
	dataLayer,
	phpErrors,
} ) => {
	// The case searches for its Snip Mug (`/?s=mug`); this test's product has a
	// generated name. A site-wide search, as in the case: a product search
	// finding one product would redirect to it.
	const pages = [
		'/',
		'/shop/',
		product.permalink,
		'/cart/',
		'/my-account/',
		`/?${ new URLSearchParams( { s: product.name } ) }`,
		'/no-such-page/',
	];
	for ( const path of pages ) {
		await storefrontPage.goto( path );
		const source = await storefrontPage.source();
		expect( source.split( GTM_START ), `GTM blocks on ${ path }` ).toHaveLength( 2 );
		expect( source.split( '</head>' )[ 0 ], `the GTM block is in <head> on ${ path }` ).toContain( GTM_START );
	}

	await storefrontPage.goto( product.permalink );
	expect( await storefrontPage.source() ).toContain( GTM_END );
	const block = ( await storefrontPage.source() ).split( GTM_START )[ 1 ].split( GTM_END )[ 0 ];
	// Any case: a `<SCRIPT …>` the plugin printed would still be a second tag.
	expect( block.match( /<script\b[^>]*>/gi ) ).toEqual( [ '<script>' ] );
	expect( block ).toContain( "'https://www.googletagmanager.com/gtm.js?id='+i+dl" );
	expect( block.trimEnd() ).toMatch( /\(window,document,'script','dataLayer','GTM-TESTID'\);<\/script>$/ );

	// The stubGtm fixture answers gtm.js, so the placeholder container's 404
	// isn't there to see: the request itself is what the case checks.
	expect( storefrontPage.requestedUrls( 'googletagmanager' ) ).toEqual( [
		'https://www.googletagmanager.com/gtm.js?id=GTM-TESTID',
	] );

	const gtmStart = await dataLayer.entriesWith( 'gtm.start' );
	expect( gtmStart ).toEqual( [ { 'gtm.start': expect.any( Number ), event: 'gtm.js' } ] );
	expect( ( await dataLayer.entries() )[ 0 ] ).toEqual( gtmStart[ 0 ] );

	await phpErrors.expectNone();
} );

test.describe( () => {
	// Without a snippet nothing creates window.dataLayer, so the plugin's
	// server-rendered pushes throw. The case lists that under "Not covered
	// here"; the known-defect case 90103b64 is about it.
	test.use( { knownPageErrors: [ { message: 'dataLayer is not defined', ticket: 'DEV-12902' } ] } );

	test( '"Disable" prints no GTM snippet and no consent script on any storefront page, and still prints the view_item push @T802ad465', async ( {
		product,
		storeOptions,
		storefrontPage,
	} ) => {
		await storeOptions( { placement: 'disable' } );

		const pages = [
			'/',
			'/shop/',
			product.permalink,
			'/cart/',
			'/my-account/',
			`/?${ new URLSearchParams( { s: product.name } ) }`,
			'/no-such-page/',
		];
		for ( const path of pages ) {
			await storefrontPage.goto( path );
			const source = await storefrontPage.source();
			// A page that broke prints no snippet either: the plugin's footer
			// config shows it rendered to the end.
			expect( source, `the page rendered: ${ path }` ).toContain( 'varGtmServerSide' );
			expect( source, `GTM block on ${ path }` ).not.toContain( GTM_START );
			expect( source, `gtm.start on ${ path }` ).not.toContain( 'gtm.start' );
			expect( source, `consent script on ${ path }` ).not.toContain( 'custom-loader' );
		}

		await storefrontPage.goto( product.permalink );
		expect( await storefrontPage.source() ).toContain( 'view_item_stape' );
		// Not just `gtm`: the plugin's own script, gtm-server-side-wordpress-plugin/…/javascript.js, matches that.
		expect( storefrontPage.requestedUrls( 'googletagmanager' ) ).toEqual( [] );
		expect( storefrontPage.requestedUrls( 'gtm.js' ) ).toEqual( [] );
	} );
} );
