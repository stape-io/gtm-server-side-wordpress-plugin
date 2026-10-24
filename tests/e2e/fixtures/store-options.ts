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
	userData: 'gtm_server_side_data_layer_user_data',
	sameOriginApiKey: 'gtm_server_side_same_origin_api_key',
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
