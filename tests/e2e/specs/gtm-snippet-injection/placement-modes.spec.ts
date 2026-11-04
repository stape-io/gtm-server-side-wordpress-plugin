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
