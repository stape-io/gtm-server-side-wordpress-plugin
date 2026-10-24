import { test as preflight, expect } from '@wordpress/e2e-test-utils-playwright';
import { findThisPlugin, getInstalledPlugins, RECREATE_ENVIRONMENT as FIX } from '../api/plugins';
import { purgeTestCoupons } from '../api/coupons';
import { purgeTestOrders } from '../api/orders';
import { purgeTestPages } from '../api/pages';
import { purgeTestCatalog } from '../api/products';
import { purgeTestTaxRates } from '../api/taxes';
import { STORE_CURRENCY } from '../data-layer/expected';
import type { PluginConfig } from '../types/plugin-config';
import {
	STORE_OPTIONS,
	STORE_OPTIONS_COOKIE,
	STORE_OPTIONS_HEADER,
	STORE_OPTIONS_PROBE,
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
 * Also removes the products, pages, coupons, tax rates and guest orders
 * killed runs left behind, and records the WordPress, WooCommerce and theme
 * versions on the test, so a report says what it ran against.
 */

const THEME = 'twentytwentyfive';

/** The same-origin proxy path bin/wp-env-configure.sh stores. */
const PROXY_PATH = '/metrics';

type InstalledTheme = { stylesheet: string; version: string };

preflight( 'Store is configured the way the specs assume @T2384d6d6', async ( { page, requestUtils } ) => {
	await purgeTestCatalog( requestUtils );
	await purgeTestPages( requestUtils );
	await purgeTestCoupons( requestUtils );
	await purgeTestTaxRates( requestUtils );
	await purgeTestOrders( requestUtils );

	const plugins = await getInstalledPlugins( requestUtils );
	const woocommerce = plugins.find( ( p ) => p.textdomain === 'woocommerce' );
	const plugin = findThisPlugin( plugins );
	expect( woocommerce?.status, `WooCommerce is not active. ${ FIX }` ).toBe( 'active' );
	expect( plugin?.status, `This plugin is not active. ${ FIX }` ).toBe( 'active' );

	// The e2e helper behind storeOptions() is a must-use plugin, so it isn't in
	// the plugins list, and being loaded wouldn't be enough anyway: it
	// overrides nothing off a local environment, nor an option missing from its
	// own list. Ask it to override every STORE_OPTIONS key and read back which
	// ones it did.
	// Any value will do: the header only names the options overridden, and
	// the probe renders no page with them.
	const everyOption = Object.fromEntries(
		Object.keys( STORE_OPTIONS ).map( ( key ) => [ key, 'yes' ] )
	) as StoreOptions;
	const probe = await page.request.get( STORE_OPTIONS_PROBE, {
		headers: { Cookie: `${ STORE_OPTIONS_COOKIE }=${ storeOptionsCookieValue( everyOption ) }` },
	} );
	// A broken page sends no header either; say so rather than blame the helper.
	expect( probe.ok(), `${ STORE_OPTIONS_PROBE } returned ${ probe.status() }. ${ FIX }` ).toBe( true );
	const overridden = ( probe.headers()[ STORE_OPTIONS_HEADER ] ?? '' ).split( ',' ).filter( Boolean );
	expect(
		overridden,
		'The e2e helper (tests/e2e/mu-plugins) overrides no options. Either it is not loaded - after a branch switch, restart the store: npm run env:e2e:stop && npm run env:e2e:start - or wp_get_environment_type() is not "local".'
	).not.toEqual( [] );
	const refused = Object.values( STORE_OPTIONS ).filter( ( name ) => ! overridden.includes( name ) );
	expect(
		refused,
		"The e2e helper plugin doesn't accept these STORE_OPTIONS: add them to GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS in its main file."
	).toEqual( [] );

	// Same-origin is half set up in the database: enable and path, so the
	// proxy's rewrite rule exists, but no API key, so it changes no page. The
	// connection test answers whenever the path is live; without a key every
	// other request under it is a 404. No storeOptions() cookie is sent here.
	const connection = await page.request.get( `${ PROXY_PATH }/?test-uid=e2e-preflight` );
	expect(
		await connection.text(),
		`The same-origin proxy doesn't answer on ${ PROXY_PATH }: gtm_server_side_same_origin_enable / _path are not set, or the rewrite rules were not flushed. ${ FIX }`
	).toBe( 'e2e-preflight' );
	const keyless = await page.request.get( `${ PROXY_PATH }/`, { maxRedirects: 0 } );
	expect(
		keyless.status(),
		`${ PROXY_PATH }/ should answer 404 on the baseline. A same-origin API key is stored in the database (specs supply it through storeOptions). ${ FIX }`
	).toBe( 404 );

	// The classic loop adds over wc-ajax only with AJAX buttons on, and a
	// redirect to the cart would load a page the add_to_cart specs don't expect.
	const wooSetting = async ( group: string, id: string ): Promise< string > =>
		( await requestUtils.rest( { path: `/wc/v3/settings/${ group }/${ id }` } ) ).value;
	expect(
		await wooSetting( 'products', 'woocommerce_enable_ajax_add_to_cart' ),
		`woocommerce_enable_ajax_add_to_cart is off. ${ FIX }`
	).toBe( 'yes' );
	expect(
		await wooSetting( 'products', 'woocommerce_cart_redirect_after_add' ),
		`woocommerce_cart_redirect_after_add is on. ${ FIX }`
	).toBe( 'no' );

	// Cart totals carry no tax, so a total is the sum the case gives; a spec
	// about tax turns it on for its own browser through storeOptions.
	expect(
		await wooSetting( 'general', 'woocommerce_calc_taxes' ),
		`woocommerce_calc_taxes is on. ${ FIX }`
	).toBe( 'no' );
	expect(
		await wooSetting( 'tax', 'woocommerce_prices_include_tax' ),
		`woocommerce_prices_include_tax is on. ${ FIX }`
	).toBe( 'no' );
	// With taxes on, a guest is taxed where the store is (a US store, so a US
	// rate applies), and the cart shows each rate as a line of its own, named
	// after the rate, apart from the net prices.
	const taxedCart: Array< [ string, string, string ] > = [
		[ 'general', 'woocommerce_default_country', 'US:CA' ],
		[ 'general', 'woocommerce_default_customer_address', 'base' ],
		[ 'tax', 'woocommerce_tax_based_on', 'shipping' ],
		[ 'tax', 'woocommerce_tax_display_cart', 'excl' ],
		[ 'tax', 'woocommerce_tax_total_display', 'itemized' ],
	];
	for ( const [ group, id, value ] of taxedCart ) {
		expect( await wooSetting( group, id ), `${ id } is not "${ value }". ${ FIX }` ).toBe( value );
	}

	// The order specs pay with it: the one gateway that needs no processor.
	const cod: { enabled: boolean } = await requestUtils.rest( { path: '/wc/v3/payment_gateways/cod' } );
	expect( cod.enabled, `Cash on delivery is disabled. ${ FIX }` ).toBe( true );

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
