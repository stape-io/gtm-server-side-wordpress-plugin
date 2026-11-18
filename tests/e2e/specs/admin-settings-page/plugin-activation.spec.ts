import { expect, test } from '../../fixtures';
import { EXCLUSIVE } from '../../fixtures/exclusive';

// Deactivating the plugin and saving its settings change every page, so these
// are exclusive tests, which siteState puts the store back after.

test( 'Activating the plugin on a site that never had it turns "Decorate dataLayer event name" on @Tcc91bba8', EXCLUSIVE, async ( {
	loginAsAdmin,
	pluginsPage,
	deleteStoredOption,
	adminSettingsPage,
	product,
	productPage,
	dataLayer,
} ) => {
	await loginAsAdmin();
	await pluginsPage.goto();
	await pluginsPage.deactivatePlugin();
	await deleteStoredOption( 'gtm_server_side_data_layer_custom_event_name' );
	await pluginsPage.activatePlugin();

	await adminSettingsPage.goto( 'data-layer' );
	await expect( adminSettingsPage.decorateEventNameCheckbox ).toBeChecked();

	await productPage.goto( product );
	await dataLayer.expectPushedOnce( 'view_item' );
	const events = ( await dataLayer.entriesWith( 'ecommerce' ) ).filter( ( entry ) => entry.ecommerce ).map( ( entry ) => entry.event );
	expect( events ).toEqual( [ 'view_item_stape' ] );
} );

test( 'Deactivating and activating the plugin keeps "Decorate dataLayer event name" off when the admin turned it off @Tb7624501', EXCLUSIVE, async ( {
	loginAsAdmin,
	adminSettingsPage,
	pluginsPage,
	product,
	productPage,
	dataLayer,
} ) => {
	await loginAsAdmin();
	await adminSettingsPage.goto( 'data-layer' );
	await adminSettingsPage.decorateEventNameCheckbox.uncheck();
	await adminSettingsPage.save();
	await expect( adminSettingsPage.savedNotice ).toBeVisible();

	await pluginsPage.goto();
	await pluginsPage.deactivatePlugin();
	await pluginsPage.activatePlugin();

	await adminSettingsPage.goto( 'data-layer' );
	await expect( adminSettingsPage.decorateEventNameCheckbox ).not.toBeChecked();

	await productPage.goto( product );
	await dataLayer.expectPushedOnce( 'view_item' );
	const events = ( await dataLayer.entriesWith( 'ecommerce' ) ).filter( ( entry ) => entry.ecommerce ).map( ( entry ) => entry.event );
	expect( events ).toEqual( [ 'view_item' ] );
} );
