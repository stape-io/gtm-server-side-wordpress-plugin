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
	/**
	 * "Add ecommerce Data Layer events". On (`yes`) on the baseline store; off,
	 * the plugin registers none of its events and doesn't enqueue its frontend
	 * script. Nothing runs when it is saved, and the plugin reads it on every
	 * request, when it loads (GTM_Server_Side_Helpers::is_enable_data_layer_ecommerce()).
	 */
	dataLayerEcommerce: 'yes' | 'no';
	/** "Add user data to Data Layer events". Not set on the baseline store. */
	userData: 'yes' | 'no';
	/**
	 * The General tab's GTM placement: `code` ("Add web GTM script onto every
	 * page") on the baseline store, `gtm_consent`, `plugin` (GTM4WP) or
	 * `disable`. Nothing runs when it is saved, and the plugin reads it on
	 * every request, when it loads (GTM_Server_Side_Tracking_Code::init()).
	 */
	placement: 'code' | 'gtm_consent' | 'plugin' | 'disable';
	/**
	 * The General tab's sGTM URL ("Server GTM container URL"), the Stape
	 * container identifier and Cookie Keeper (`yes`): not set on the baseline
	 * store. Saving any of them makes the plugin fetch a custom loader from the
	 * Stape API, and saving the identifier clears the loader cache, so a test of
	 * either saves them in wp-admin instead. The snippet reads them on every
	 * request (GTM_Server_Side_Tracking_Code::wp_head()).
	 *
	 * The cache of the identifier's prefix and the encoded Web GTM ID is
	 * site-wide and not keyed by the identifier, so a test that overrides the
	 * identifier gives itself a cache of its own first, loaderCache.isolate().
	 */
	webContainerUrl: string;
	webIdentifier: string;
	/** `yes` on; `''` is how wp-admin saves the unticked checkbox. */
	cookieKeeper: 'yes' | '';
	/**
	 * The custom loader fetched from the Stape API, the script the plugin
	 * prints instead of any snippet. Not set on the baseline store; the plugin
	 * stores it itself, after a save in wp-admin or from its cron, and reads it
	 * on every request.
	 */
	customLoaderFromApi: string;
	/**
	 * The same-origin proxy's Stape API key. Saving it only flushes the rewrite
	 * rules (and, in wp-admin, rebuilds the custom loader); the proxy path's
	 * rule doesn't depend on the key, and the proxy reads it per request.
	 *
	 * The helper applies it to requests under the proxy path only, so a proxy
	 * test's pages render as without the key. With it and no loader from the
	 * Stape API, a page prints Google's GTM snippet and drops Cookie Keeper
	 * (DEV-13426): a test of those pages uses sameOriginApiKeyOnEveryPage.
	 */
	sameOriginApiKey: string;
	/**
	 * The same-origin API key on every page, not only under the proxy path:
	 * the helper names it `<option>@every_page`. A live store has this state
	 * when Stape didn't send the same-origin loader on the save: the page
	 * prints Google's GTM snippet (DEV-13426), with no Cookie Keeper. For a
	 * case about those pages; a proxy test uses sameOriginApiKey.
	 */
	sameOriginApiKeyOnEveryPage: string;
	/**
	 * WooCommerce's product grid ("Products per row" and "Rows per page" in
	 * the Customizer); a page holds columns x rows products. Not set on the
	 * baseline store, so 4 x 4 unless something set them by hand: a spec that
	 * counts the products on a page sets both. Nothing runs when they are
	 * saved, and WooCommerce reads them on every page that renders a grid.
	 */
	catalogColumns: string;
	catalogRows: string;
	/**
	 * WooCommerce's "Enable AJAX add to cart buttons on archives". On (`yes`)
	 * on the baseline store; off, a grid's "Add to cart" is a plain
	 * `?add-to-cart=` link that loads a page. Nothing runs when it is saved,
	 * and WooCommerce reads it on every page that renders a grid.
	 */
	ajaxAddToCart: 'yes' | 'no';
	/**
	 * WooCommerce's "Redirect to the cart page after successful addition". Off
	 * on the baseline store; on, an `?add-to-cart=` request answers with a
	 * redirect and renders no page. Nothing runs when it is saved, and
	 * WC_Form_Handler reads it on the add-to-cart request itself.
	 */
	cartRedirectAfterAdd: 'yes' | 'no';
	/**
	 * WooCommerce's "Enable tax rates and calculations". Off (`no`) on the
	 * baseline store, so no cart has tax unless a test turns it on. Nothing
	 * runs when it is saved, and wc_tax_enabled() reads it on every request
	 * that prices a cart, the Store API's included.
	 */
	calcTaxes: 'yes' | 'no';
	/**
	 * WooCommerce's "Prices entered with tax": `yes` is inclusive of tax. Off
	 * on the baseline store, and it matters only with calcTaxes on. Nothing
	 * runs when it is saved; WooCommerce reads it per request, and when it
	 * loads (WC_TAX_ROUNDING_MODE), which is after the helper plugin.
	 */
	pricesIncludeTax: 'yes' | 'no';
	/**
	 * WooCommerce's "Allow customers to create an account on the My account
	 * page". Off on the baseline store; on, My Account shows a Register form.
	 * Nothing runs when it is saved, and WooCommerce reads it when it renders
	 * My Account (myaccount/form-login.php).
	 */
	myAccountRegistration: 'yes' | 'no';
	/**
	 * WooCommerce's "Allow customers to create an account during checkout".
	 * Off on the baseline store; on, the checkout offers "Create an account".
	 * Nothing runs when it is saved, and WC_Checkout::is_registration_enabled()
	 * reads it when the checkout renders and when the Store API places the order.
	 */
	checkoutSignup: 'yes' | 'no';
};

export const STORE_OPTIONS = {
	dataLayerEcommerce: 'gtm_server_side_data_layer_ecommerce',
	userData: 'gtm_server_side_data_layer_user_data',
	placement: 'gtm_server_side_placement',
	webContainerUrl: 'gtm_server_side_web_container_url',
	webIdentifier: 'gtm_server_side_web_identifier',
	cookieKeeper: 'gtm_server_side_cookie_keeper',
	customLoaderFromApi: 'gtm_server_side_gtm_custom_loader_from_api',
	sameOriginApiKey: 'gtm_server_side_same_origin_api_key',
	sameOriginApiKeyOnEveryPage: 'gtm_server_side_same_origin_api_key@every_page',
	catalogColumns: 'woocommerce_catalog_columns',
	catalogRows: 'woocommerce_catalog_rows',
	ajaxAddToCart: 'woocommerce_enable_ajax_add_to_cart',
	cartRedirectAfterAdd: 'woocommerce_cart_redirect_after_add',
	calcTaxes: 'woocommerce_calc_taxes',
	pricesIncludeTax: 'woocommerce_prices_include_tax',
	myAccountRegistration: 'woocommerce_enable_myaccount_registration',
	checkoutSignup: 'woocommerce_enable_signup_and_login_from_checkout',
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
