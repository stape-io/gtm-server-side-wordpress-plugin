import { test as preflight, expect } from '@wordpress/e2e-test-utils-playwright';
import { findThisPlugin, getInstalledPlugins, RECREATE_ENVIRONMENT as FIX } from '../api/plugins';
import { purgeTestCatalog } from '../api/products';
import { STORE_CURRENCY } from '../data-layer/expected';
import type { PluginConfig } from '../types/plugin-config';
import {
	E2E_HELPER_TEXT_DOMAIN,
	STORE_OPTIONS,
	STORE_OPTIONS_COOKIE,
	STORE_OPTIONS_HEADER,
	storeOptionsCookieValue,
	type StoreOptions,
} from '../fixtures/store-options';

/**
 * Checks, once per run and before any spec starts, that the store is in the
 * state bin/wp-env-configure.sh puts it in - everything the specs depend on.
 * A misconfigured environment then fails here, with a message that says how
 * to fix it, instead of as a puzzling assertion failure inside every spec.
 *
 * Uses the base test, not the one from ../fixtures: that one runs the pageErrors
 * and pluginDir fixtures first, which would fail before any of the checks below
 * ran and hide what they would have said.
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
	// Behind the storeOptions fixture (see fixtures/store-options.ts).
	const helper = plugins.find( ( p ) => p.textdomain === E2E_HELPER_TEXT_DOMAIN );
	expect( helper?.status, `The e2e helper plugin is not active. ${ FIX }` ).toBe( 'active' );

	// Active is not enough: the helper overrides nothing off a local
	// environment, nor an option missing from its own list. Ask it to
	// override every STORE_OPTIONS key and read back which ones it did.
	const everyOption = Object.fromEntries(
		Object.keys( STORE_OPTIONS ).map( ( key ) => [ key, 'yes' ] )
	) as StoreOptions;
	const probe = await page.request.get( '/shop/', {
		headers: { Cookie: `${ STORE_OPTIONS_COOKIE }=${ storeOptionsCookieValue( everyOption ) }` },
	} );
	// A broken page sends no header either; say so rather than blame the helper.
	expect( probe.ok(), `/shop/ returned ${ probe.status() }. ${ FIX }` ).toBe( true );
	const overridden = ( probe.headers()[ STORE_OPTIONS_HEADER ] ?? '' ).split( ',' ).filter( Boolean );
	expect(
		overridden,
		'The e2e helper plugin overrides no options: it works only where wp_get_environment_type() is "local".'
	).not.toEqual( [] );
	const refused = Object.values( STORE_OPTIONS ).filter( ( name ) => ! overridden.includes( name ) );
	expect(
		refused,
		"The e2e helper plugin doesn't accept these STORE_OPTIONS: add them to GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS in its main file."
	).toEqual( [] );

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
	// Off in the database: event specs compare whole events, so user_data must
	// be absent unless a test turns it on for itself through storeOptions.
	expect(
		config?.user_data,
		`gtm_server_side_data_layer_user_data is on in the database. ${ FIX }`
	).toBeUndefined();

	// eslint-disable-next-line playwright/no-raw-locators -- a <meta> tag has no role or text to find it by.
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
