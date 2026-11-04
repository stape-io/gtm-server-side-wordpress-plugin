import { test } from '../../fixtures';

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
