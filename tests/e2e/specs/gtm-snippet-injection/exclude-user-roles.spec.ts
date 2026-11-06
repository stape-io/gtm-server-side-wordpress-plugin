import { expect, test } from '../../fixtures';

test( 'An excluded user gets no JS error from the server-rendered data layer events @T0e751329', async ( {
	storeOptions,
	catalog,
	wpLoginPage,
	productPage,
	homePage,
	dataLayer,
	product,
} ) => {
	await storeOptions( { gtmExcludeRoles: 'yes', gtmExcludeListRoles: [ 'editor' ] } );
	const editor = await catalog.createUser( 'editor' );

	await wpLoginPage.goto();
	await wpLoginPage.logIn( editor );

	// The pageErrors fixture fails the test on the plugin's JS errors. The
	// case doesn't cover whether an excluded user should get the events; the
	// pushes are awaited only to show the inline scripts ran on each page.
	await productPage.goto( product );
	await dataLayer.expectPushedOnce( 'view_item' );

	await homePage.goto();
	await dataLayer.expectPushedOnce( { ecomm_pagetype: 'home' } );
} );

test( 'An excluded user gets no JS error from an AJAX add to cart on a product grid, and still loads no GTM @Tbdee7089', async ( {
	storeOptions,
	catalog,
	wpLoginPage,
	classicLoopPage,
	gtmLoader,
	dataLayer,
	product,
} ) => {
	await storeOptions( { gtmExcludeRoles: 'yes', gtmExcludeListRoles: [ 'editor' ] } );
	const editor = await catalog.createUser( 'editor' );
	const loopPage = await catalog.createClassicLoopPage( product.category );

	await wpLoginPage.goto();
	await wpLoginPage.logIn( editor );

	await classicLoopPage.goto( loopPage );
	await classicLoopPage.addToCart( product.name );

	// The pageErrors fixture fails the test on the plugin's JS errors. The push
	// is awaited only to show the click's handler ran to the end; with no GTM
	// on the page nothing reads it.
	await dataLayer.expectPushedOnce( 'add_to_cart' );
	expect( gtmLoader.gtmJsRequests() ).toEqual( [] );
} );
