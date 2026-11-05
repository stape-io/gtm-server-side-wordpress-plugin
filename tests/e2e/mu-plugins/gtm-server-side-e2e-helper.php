<?php
/**
 * Plugin Name:       GTM Server Side e2e helper
 * Description:       Test-only. Overrides store options for the requests of one e2e test, read from a cookie. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * A must-use plugin: .wp-env.e2e.json maps tests/e2e/mu-plugins into
 * wp-content/mu-plugins, so it loads on every request, before any regular
 * plugin reads the options it overrides, and can't be switched off.
 *
 * @package GTM_Server_Side_E2E_Helper
 */

defined( 'ABSPATH' ) || exit;

/**
 * Cookie the storeOptions() fixture in tests/e2e/fixtures/ sets on one test's
 * browser context: a URL-encoded JSON map of option name => value.
 *
 * Each option it names is answered from the cookie through pre_option_<name>,
 * so get_option() returns that value for this browser's requests only. The
 * database is never written, which keeps tests running in parallel on the
 * shared site from seeing each other's settings.
 *
 * It overrides reads only. Code that runs when an option is saved
 * (update_option_<name> hooks) never runs, so only options read during a
 * request belong in the list below - see tests/e2e/README.md.
 */
const GTM_SERVER_SIDE_E2E_OPTIONS_COOKIE = 'gtm_e2e_options';

/**
 * The only options a cookie may override. Anyone can set a cookie, so
 * without this list a visitor could override any option, such as
 * users_can_register and default_role. Keep it in step with STORE_OPTIONS in
 * tests/e2e/fixtures/store-options.ts.
 */
const GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS = array(
	'gtm_server_side_data_layer_ecommerce',
	'gtm_server_side_data_layer_user_data',
	'gtm_server_side_placement',
	'gtm_server_side_gtm_exclude_roles',
	'gtm_server_side_gtm_exclude_list_roles',
	'gtm_server_side_web_container_url',
	'gtm_server_side_web_identifier',
	'gtm_server_side_cookie_keeper',
	'gtm_server_side_gtm_custom_loader_from_api',
	'gtm_server_side_same_origin_api_key',
	'gtm_server_side_same_origin_api_key@every_page',
	'woocommerce_catalog_columns',
	'woocommerce_catalog_rows',
	'woocommerce_enable_ajax_add_to_cart',
	'woocommerce_cart_redirect_after_add',
	'woocommerce_calc_taxes',
	'woocommerce_prices_include_tax',
	'woocommerce_enable_myaccount_registration',
	'woocommerce_enable_signup_and_login_from_checkout',
);

/**
 * Options stored as an array: the cookie gives them as a JSON list of
 * strings, the way wp-admin saves them (the excluded user roles).
 */
const GTM_SERVER_SIDE_E2E_ARRAY_OPTIONS = array(
	'gtm_server_side_gtm_exclude_list_roles',
);

/**
 * Options applied only to requests under the same-origin proxy path, so a
 * proxy test's pages render as without them. With the API key and no loader
 * fetched from the Stape API, a page prints Google's GTM snippet and deletes
 * the Cookie Keeper cookie (DEV-13426), which a proxy test doesn't ask for.
 */
const GTM_SERVER_SIDE_E2E_PROXY_PATH_ONLY_OPTIONS = array(
	'gtm_server_side_same_origin_api_key',
);

/**
 * Names a cookie may use to override an option on every request, where the
 * option itself is proxy-path only: `<option>@every_page` => `<option>`. The
 * same-origin API key with no loader from the Stape API is a state a live
 * store has when Stape didn't answer the save, so a test of those pages asks
 * for it. It wins over the proxy-path-only name when the cookie holds both.
 */
const GTM_SERVER_SIDE_E2E_EVERY_PAGE_ALIASES = array(
	'gtm_server_side_same_origin_api_key@every_page' => 'gtm_server_side_same_origin_api_key',
);

/**
 * Whether this request is under the same-origin proxy path stored in the
 * database. False while no path is stored.
 */
function gtm_server_side_e2e_is_proxy_request(): bool {
	$path = trim( (string) get_option( 'gtm_server_side_same_origin_path' ), '/' );
	if ( '' === $path ) {
		return false;
	}

	$base = rtrim( (string) wp_parse_url( home_url( '/' . $path ), PHP_URL_PATH ), '/' );
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, compared, never output.
	$request = (string) wp_parse_url( isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH );

	return $request === $base || 0 === strpos( $request, $base . '/' );
}

/**
 * Read here, while the plugin loads, rather than inside the filter:
 * wp_magic_quotes() slashes $_COOKIE later in the request.
 */
function gtm_server_side_e2e_cookie_options(): array {
	if ( empty( $_COOKIE[ GTM_SERVER_SIDE_E2E_OPTIONS_COOKIE ] ) ) {
		return array();
	}

	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, JSON decoded and filtered below.
	$options = json_decode( $_COOKIE[ GTM_SERVER_SIDE_E2E_OPTIONS_COOKIE ], true );
	if ( ! is_array( $options ) ) {
		return array();
	}

	// Values of the type the option is stored as: a string, or for an array
	// option a list of strings. A false from pre_option_<name> would mean
	// "don't override", and a value of another type isn't what the plugin
	// ever reads from the database.
	return array_filter(
		array_intersect_key( $options, array_flip( GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS ) ),
		static function ( $value, string $name ): bool {
			if ( ! in_array( $name, GTM_SERVER_SIDE_E2E_ARRAY_OPTIONS, true ) ) {
				return is_string( $value );
			}
			return is_array( $value ) && array_values( $value ) === $value && array_filter( $value, 'is_string' ) === $value;
		},
		ARRAY_FILTER_USE_BOTH
	);
}

// Off anywhere but a local install (wp-env sets WP_ENVIRONMENT_TYPE to
// "local"), so the plugin does nothing if it ever reaches a shared site.
if ( 'local' === wp_get_environment_type() ) {
	$gtm_server_side_e2e_options = gtm_server_side_e2e_cookie_options();

	$gtm_server_side_e2e_overrides = array();
	foreach ( $gtm_server_side_e2e_options as $gtm_server_side_e2e_name => $gtm_server_side_e2e_value ) {
		if ( isset( GTM_SERVER_SIDE_E2E_EVERY_PAGE_ALIASES[ $gtm_server_side_e2e_name ] ) ) {
			continue;
		}
		if (
			in_array( $gtm_server_side_e2e_name, GTM_SERVER_SIDE_E2E_PROXY_PATH_ONLY_OPTIONS, true ) &&
			! gtm_server_side_e2e_is_proxy_request()
		) {
			continue;
		}
		$gtm_server_side_e2e_overrides[ $gtm_server_side_e2e_name ] = $gtm_server_side_e2e_value;
	}
	foreach ( GTM_SERVER_SIDE_E2E_EVERY_PAGE_ALIASES as $gtm_server_side_e2e_alias => $gtm_server_side_e2e_name ) {
		if ( isset( $gtm_server_side_e2e_options[ $gtm_server_side_e2e_alias ] ) ) {
			$gtm_server_side_e2e_overrides[ $gtm_server_side_e2e_name ] = $gtm_server_side_e2e_options[ $gtm_server_side_e2e_alias ];
		}
	}

	foreach ( $gtm_server_side_e2e_overrides as $gtm_server_side_e2e_name => $gtm_server_side_e2e_value ) {
		add_filter(
			'pre_option_' . $gtm_server_side_e2e_name,
			static function () use ( $gtm_server_side_e2e_value ) {
				return $gtm_server_side_e2e_value;
			}
		);
	}

	// Names the options the cookie may set here - all it named that are on the
	// list above, including the proxy-path ones this request leaves alone - so
	// the preflight can tell a helper that is off, or an option missing from
	// the list, from a failing spec. The preflight's probe stops here, before
	// any page is rendered with the values it sent.
	if ( $gtm_server_side_e2e_options ) {
		add_action(
			'send_headers',
			static function () use ( $gtm_server_side_e2e_options ) {
				header( 'X-GTM-E2E-Options: ' . implode( ',', array_keys( $gtm_server_side_e2e_options ) ) );
				// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- test-only probe flag.
				if ( isset( $_GET['gtm-e2e-probe'] ) ) {
					exit;
				}
			}
		);
	}
}
