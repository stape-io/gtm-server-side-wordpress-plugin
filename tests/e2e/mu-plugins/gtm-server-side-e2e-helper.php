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
	'gtm_server_side_data_layer_user_data',
	'gtm_server_side_same_origin_api_key',
	'woocommerce_catalog_columns',
	'woocommerce_catalog_rows',
	'woocommerce_enable_ajax_add_to_cart',
	'woocommerce_cart_redirect_after_add',
);

/**
 * Options applied only to requests under the same-origin proxy path. With the
 * API key, any other page would switch to same-origin (service worker patch,
 * identifier from the key, no Cookie Keeper) while keeping the raw sGTM URL,
 * since the same-origin loader exists only after a real save: a state no live
 * store has. Elsewhere the page renders as if the cookie didn't name them.
 */
const GTM_SERVER_SIDE_E2E_PROXY_PATH_ONLY_OPTIONS = array(
	'gtm_server_side_same_origin_api_key',
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

	// Strings only, as stored options are: a false from pre_option_<name>
	// would mean "don't override", and an array isn't an option value here.
	return array_filter(
		array_intersect_key( $options, array_flip( GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS ) ),
		'is_string'
	);
}

// Off anywhere but a local install (wp-env sets WP_ENVIRONMENT_TYPE to
// "local"), so the plugin does nothing if it ever reaches a shared site.
if ( 'local' === wp_get_environment_type() ) {
	$gtm_server_side_e2e_options = gtm_server_side_e2e_cookie_options();

	foreach ( $gtm_server_side_e2e_options as $gtm_server_side_e2e_name => $gtm_server_side_e2e_value ) {
		if (
			in_array( $gtm_server_side_e2e_name, GTM_SERVER_SIDE_E2E_PROXY_PATH_ONLY_OPTIONS, true ) &&
			! gtm_server_side_e2e_is_proxy_request()
		) {
			continue;
		}
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
