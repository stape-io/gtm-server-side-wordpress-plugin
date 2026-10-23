/**
 * Store settings a test can override for its own browser, through the e2e
 * helper plugin (mu-plugins/gtm-server-side-e2e-helper.php): the fixture sets a
 * cookie, and the helper answers get_option() from it for that browser's
 * requests only. The database is never written, so tests running in parallel
 * never see each other's settings.
 *
 * Only options read during a request belong here. The override skips
 * everything that runs when an option is saved (update_option_<name> hooks),
 * so it fits an option with such a hook only when what the test checks
 * doesn't need that hook. See "Store settings" in tests/e2e/README.md.
 *
 * The helper plugin accepts only the options in its own list
 * (GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS), so a key added here goes there too.
 */
/** The value each setting takes, as WordPress stores it. */
type StoreOptionValues = {
	/** "Add user data to Data Layer events". Not set on the baseline store. */
	userData: 'yes' | 'no';
	/**
	 * The same-origin proxy's Stape API key. Saving it only flushes the rewrite
	 * rules (and, in wp-admin, rebuilds the custom loader); the proxy path's
	 * rule doesn't depend on the key, and the proxy reads it per request.
	 *
	 * The helper applies it to requests under the proxy path only. With the
	 * key, any other page would switch to same-origin (service worker patch,
	 * identifier from the key, no Cookie Keeper) while keeping the raw sGTM
	 * URL, since the same-origin loader exists only after a real save - a state
	 * no live store has - so elsewhere it renders as without the key.
	 */
	sameOriginApiKey: string;
	/**
	 * WooCommerce's product grid ("Products per row" and "Rows per page" in
	 * the Customizer); a page holds columns x rows products. Not set on the
	 * baseline store, so 4 x 4 unless something set them by hand: a spec that
	 * counts the products on a page sets both. Nothing runs when they are
	 * saved, and WooCommerce reads them on every page that renders a grid.
	 */
	catalogColumns: string;
	catalogRows: string;
};

export const STORE_OPTIONS = {
	userData: 'gtm_server_side_data_layer_user_data',
	sameOriginApiKey: 'gtm_server_side_same_origin_api_key',
	catalogColumns: 'woocommerce_catalog_columns',
	catalogRows: 'woocommerce_catalog_rows',
} as const satisfies Record< keyof StoreOptionValues, string >;

export type StoreOption = keyof typeof STORE_OPTIONS;

export type StoreOptions = Partial< StoreOptionValues >;

/** Read by the helper plugin; the PHP side names it GTM_SERVER_SIDE_E2E_OPTIONS_COOKIE. */
export const STORE_OPTIONS_COOKIE = 'gtm_e2e_options';

/** Response header in which the helper names the options it accepted from the cookie. */
export const STORE_OPTIONS_HEADER = 'x-gtm-e2e-options';

/** A request with this query arg gets the header and nothing else: no page is rendered. */
export const STORE_OPTIONS_PROBE = '/?gtm-e2e-probe=1';

/** The cookie value: option name => value, as URL-encoded JSON. */
export function storeOptionsCookieValue( options: StoreOptions ): string {
	const byName = Object.fromEntries(
		Object.entries( options ).map( ( [ key, value ] ) => [ STORE_OPTIONS[ key as StoreOption ], value ] )
	);
	return encodeURIComponent( JSON.stringify( byName ) );
}
