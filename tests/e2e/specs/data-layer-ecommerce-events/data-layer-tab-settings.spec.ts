import { expect, test } from '../../fixtures';

test( 'With ecommerce events off, no ecommerce entry is pushed on product, category, cart, checkout or home pages, and the front-end script isn\'t loaded @Td6415c7e', async ( {
	storeOptions,
	catalog,
	productPage,
	categoryPage,
	homePage,
	cartPage,
	checkoutPage,
	dataLayer,
} ) => {
	await storeOptions( { dataLayerEcommerce: 'no' } );
	const parent = await catalog.createCategory();
	const child = await catalog.createCategory( parent );
	const product = await catalog.createProduct( child );

	// Without the frontend script there is no varGtmServerSide for
	// expectNotPushed() to require, so each page first shows it rendered: the
	// entries the plugin prints in wp_footer would be in the dataLayer by then.
	// The GTM snippet's gtm.start entry, which doesn't depend on the setting,
	// shows the empty lists come from a dataLayer, not from its absence.
	await productPage.goto( product );
	await expect( productPage.title( product ) ).toBeVisible();
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).not.toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecommerce' ) ).toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecomm_pagetype' ) ).toEqual( [] );
	expect( await dataLayer.hasPluginConfig() ).toBe( false );
	expect( await productPage.source() ).not.toContain( 'assets/js/javascript.js' );

	await categoryPage.goto( child );
	expect( await categoryPage.productNames() ).toEqual( [ product.name ] );
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).not.toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecommerce' ) ).toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecomm_pagetype' ) ).toEqual( [] );
	expect( await dataLayer.hasPluginConfig() ).toBe( false );
	await expect( categoryPage.gtmItemData() ).toHaveCount( 0 );

	await homePage.goto();
	await expect( homePage.footer ).toBeVisible();
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).not.toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecommerce' ) ).toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecomm_pagetype' ) ).toEqual( [] );
	expect( await dataLayer.hasPluginConfig() ).toBe( false );

	await homePage.gotoAddingToCart( product );
	await expect( homePage.footer ).toBeVisible();
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).not.toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecommerce' ) ).toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecomm_pagetype' ) ).toEqual( [] );
	expect( await dataLayer.hasPluginConfig() ).toBe( false );

	await cartPage.goto();
	await expect( cartPage.item( product ) ).toBeVisible();
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).not.toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecommerce' ) ).toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecomm_pagetype' ) ).toEqual( [] );
	expect( await dataLayer.hasPluginConfig() ).toBe( false );

	await checkoutPage.goto();
	await expect( checkoutPage.summaryItem( product ) ).toBeVisible();
	expect( await dataLayer.entriesWith( 'gtm.start' ) ).not.toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecommerce' ) ).toEqual( [] );
	expect( await dataLayer.entriesWith( 'ecomm_pagetype' ) ).toEqual( [] );
	expect( await dataLayer.hasPluginConfig() ).toBe( false );
} );

test( 'Unchecking "Add ecommerce Data Layer events" disables and unchecks "Add user data to Data Layer events" @Tda0fc236', async ( {
	loginAsAdmin,
	adminSettingsPage,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'data-layer' );

	// Nothing is saved: the pairing lives in the tab's script only.
	await adminSettingsPage.userDataCheckbox.check();
	await adminSettingsPage.ecommerceCheckbox.uncheck();
	await expect( adminSettingsPage.userDataCheckbox ).toBeDisabled();
	await expect( adminSettingsPage.userDataCheckbox ).not.toBeChecked();

	await adminSettingsPage.ecommerceCheckbox.check();
	await expect( adminSettingsPage.userDataCheckbox ).toBeEnabled();
	await expect( adminSettingsPage.userDataCheckbox ).not.toBeChecked();
} );
