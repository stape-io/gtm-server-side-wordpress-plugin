import { expect, test } from '../../fixtures';
import { GTM_START } from '../../data-layer/gtm-snippet';

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
	// login_state comes first, printed ahead of every loader (DEV-12488); the
	// snippet's push is the very next entry.
	const [ first, second ] = await dataLayer.entries();
	expect( first ).toEqual( { login_state: 'logged-out' } );
	expect( second ).toEqual( gtmStart[ 0 ] );

	await phpErrors.expectNone();
} );

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

test( 'With placement "Disable", the server-rendered data layer events run without a JS error @T90103b64', async ( {
	storeOptions,
	productPage,
	homePage,
	dataLayer,
	product,
} ) => {
	await storeOptions( { placement: 'disable' } );

	// The pageErrors fixture fails the test on the plugin's JS errors on both
	// pages, a ReferenceError from its inline pushes included.
	await productPage.goto( product );
	await dataLayer.expectPushedOnce( 'view_item' );
	expect( await dataLayer.entriesWith( 'gtm.start' ), 'no GTM snippet is printed' ).toEqual( [] );

	// home's push is the inline script on `/`: waiting for it shows it ran.
	await homePage.goto();
	await dataLayer.expectPushedOnce( { ecomm_pagetype: 'home' } );
} );

test( 'With placement "Disable", an AJAX add to cart from a product grid pushes add_to_cart without a JS error @T168e1b18', async ( {
	storeOptions,
	catalog,
	classicLoopPage,
	dataLayer,
	product,
} ) => {
	await storeOptions( { placement: 'disable' } );
	const loopPage = await catalog.createClassicLoopPage( product.category );

	await classicLoopPage.goto( loopPage );
	expect( await dataLayer.exists(), 'nothing on the page created the dataLayer before the click' ).toBe( false );

	// The pageErrors fixture fails the test on the plugin's JS errors, a
	// ReferenceError from the front-end script's push included.
	await classicLoopPage.addToCart( product.name );
	await dataLayer.expectPushedOnce( 'add_to_cart' );
} );
