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
export const STORE_OPTIONS = {
	/** "Add user data to Data Layer events" ('yes' / 'no'). Not set on the baseline store. */
	userData: 'gtm_server_side_data_layer_user_data',
	/**
	 * The same-origin proxy's Stape API key. Saving it only flushes the rewrite
	 * rules (and, in wp-admin, rebuilds the custom loader); the proxy path's
	 * rule doesn't depend on the key, and the proxy reads it per request, so a
	 * proxy spec can supply it here.
	 */
	sameOriginApiKey: 'gtm_server_side_same_origin_api_key',
} as const;

export type StoreOption = keyof typeof STORE_OPTIONS;

/** Values as WordPress stores them: 'yes' / 'no' for a checkbox, the text for a field. */
export type StoreOptions = Partial< Record< StoreOption, string > >;

/** Read by the helper plugin; the PHP side names it GTM_SERVER_SIDE_E2E_OPTIONS_COOKIE. */
export const STORE_OPTIONS_COOKIE = 'gtm_e2e_options';

/** Response header in which the helper names the options it overrode. */
export const STORE_OPTIONS_HEADER = 'x-gtm-e2e-options';

/** The cookie value: option name => value, as URL-encoded JSON. */
export function storeOptionsCookieValue( options: StoreOptions ): string {
	const byName = Object.fromEntries(
		Object.entries( options ).map( ( [ key, value ] ) => [ STORE_OPTIONS[ key as StoreOption ], value ] )
	);
	return encodeURIComponent( JSON.stringify( byName ) );
}
