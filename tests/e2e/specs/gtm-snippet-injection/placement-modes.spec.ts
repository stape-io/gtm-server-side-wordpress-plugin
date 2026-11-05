import { expect, test } from '../../fixtures';

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
