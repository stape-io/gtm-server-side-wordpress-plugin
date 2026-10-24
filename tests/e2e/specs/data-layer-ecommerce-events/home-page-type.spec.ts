import { expect, test } from '../../fixtures';
import { withoutCartState } from '../../data-layer/expected';

test( 'The home page at / pushes {ecomm_pagetype: "home"} with no event key @T31f0be8c', async ( {
	homePage,
	dataLayer,
} ) => {
	await homePage.goto();

	const home = await dataLayer.expectPushedOnce( { ecomm_pagetype: 'home' } );
	// Spelled out: the entry carries no fixture data to build it from, and its
	// missing `event` is what the case checks.
	expect( withoutCartState( home ) ).toEqual( { ecomm_pagetype: 'home' } );
} );

test( 'The home page opened with a query string (e.g. a UTM link) pushes no home entry @Tdf9dcf4b', async ( {
	homePage,
	dataLayer,
} ) => {
	await homePage.goto( { utm_source: 'x' } );

	// The home entry is decided on in wp_footer, before the footer scripts that
	// carry varGtmServerSide, which expectNotPushed() requires: the footer
	// rendered, without the home entry.
	await dataLayer.expectNotPushed( { ecomm_pagetype: 'home' } );
} );
