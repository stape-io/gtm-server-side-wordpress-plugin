import { test as setup, expect } from '@wordpress/e2e-test-utils-playwright';
import type { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import type { PluginConfig } from '../types/plugin-config';

/**
 * Environment checks, kept out of the specs.
 *
 * A spec should read as a shopper scenario; whether the store under test was
 * configured correctly is a property of bin/wp-env-setup.sh, not of the
 * behaviour being tested. Running it as a Playwright setup project (see
 * `dependencies` in playwright.config.ts) means a misconfigured environment
 * fails once, up front, with a message that says how to fix it - rather than
 * once per worker, or as a puzzling assertion failure inside every spec.
 */

/**
 * Reads the `varGtmServerSide` object the plugin localizes into the storefront,
 * straight from the rendered HTML - no browser needed.
 */
async function readPluginConfig( requestUtils: RequestUtils ): Promise< PluginConfig > {
	const html = await ( await requestUtils.request.get( '/shop/' ) ).text();
	const match = html.match( /var varGtmServerSide = (\{.*?\});/s );

	if ( ! match ) {
		throw new Error(
			'The plugin did not localize varGtmServerSide on /shop/. Is the plugin active and is /shop/ reachable? Try: npm run env:start'
		);
	}

	return JSON.parse( match[ 1 ] ) as PluginConfig;
}

setup( 'store is configured for data layer specs', async ( { requestUtils } ) => {
	const config = await readPluginConfig( requestUtils );

	// Drives both the `_stape` event name suffix and whether add_to_cart
	// carries a `cart_state` payload (see _pushWithStateCartData() in
	// assets/js/javascript.js). Specs assert on both.
	expect(
		config.is_custom_event_name,
		"Enable it with: npx wp-env run cli wp option update gtm_server_side_data_layer_custom_event_name 'yes' (bin/wp-env-setup.sh does this on env start)"
	).toBe( 'yes' );
} );
