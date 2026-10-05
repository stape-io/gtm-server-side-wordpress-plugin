import { test as preflight, expect } from '../fixtures';
import { findThisPlugin, getInstalledPlugins, RECREATE_ENVIRONMENT as FIX } from '../api/plugins';
import { purgeTestCatalog } from '../api/products';
import { STORE_CURRENCY } from '../data-layer/expected';
import type { PluginConfig } from '../types/plugin-config';

/**
 * Checks, once per run and before any spec starts, that the store is in the
 * state bin/wp-env-configure.sh puts it in - everything the specs depend on.
 * A misconfigured environment then fails here, with a message that says how
 * to fix it, instead of as a puzzling assertion failure inside every spec.
 *
 * Also removes catalog leftovers from killed runs, and records the WordPress,
 * WooCommerce and theme versions on the test, so a report says what it ran
 * against.
 */

const THEME = 'twentytwentyfive';

type InstalledTheme = { stylesheet: string; version: string };

preflight( 'store is configured the way the specs assume', async ( { page, requestUtils } ) => {
	await purgeTestCatalog( requestUtils );

	const plugins = await getInstalledPlugins( requestUtils );
	const woocommerce = plugins.find( ( p ) => p.textdomain === 'woocommerce' );
	const plugin = findThisPlugin( plugins );
	expect( woocommerce?.status, `WooCommerce is not active. ${ FIX }` ).toBe( 'active' );
	expect( plugin?.status, `This plugin is not active. ${ FIX }` ).toBe( 'active' );

	const [ theme ]: InstalledTheme[] = await requestUtils.rest( {
		path: '/wp/v2/themes',
		params: { status: 'active' },
	} );
	expect( theme?.stylesheet, `Page objects are written against ${ THEME }. ${ FIX }` ).toBe( THEME );

	await page.goto( '/shop/' );
	const config = await page.evaluate(
		() => ( window as unknown as { varGtmServerSide?: PluginConfig } ).varGtmServerSide
	);
	expect(
		config,
		`The plugin's frontend script is missing on /shop/, so its ecommerce data layer (gtm_server_side_data_layer_ecommerce) is off. ${ FIX }`
	).toBeDefined();
	expect( config?.currency, `Specs expect a ${ STORE_CURRENCY } store. ${ FIX }` ).toBe( STORE_CURRENCY );
	// Drives the `_stape` event name suffix and the `cart_state` payload, which
	// specs assert on.
	expect(
		config?.is_custom_event_name,
		`gtm_server_side_data_layer_custom_event_name is off. ${ FIX }`
	).toBe( 'yes' );
	expect( config?.DATA_LAYER_CUSTOM_EVENT_NAME ).toBe( '_stape' );

	const wordpress = await page
		.locator( 'meta[name="generator"][content^="WordPress "]' )
		.getAttribute( 'content' );
	preflight.info().annotations.push(
		{ type: 'WordPress', description: wordpress?.replace( 'WordPress ', '' ) },
		{ type: 'WooCommerce', description: woocommerce?.version },
		{ type: 'Theme', description: `${ theme.stylesheet } ${ theme.version }` },
		{ type: 'Plugin', description: plugin?.version }
	);
} );
