<?php
/**
 * Plugin Name:       GTM Server Side e2e helper
 * Description:       Test-only. Overrides store options for the requests of one e2e test, read from a cookie. Works on a local environment only. Loaded by .wp-env.e2e.json.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 * Text Domain:       gtm-server-side-e2e-helper
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
);

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

	return array_intersect_key( $options, array_flip( GTM_SERVER_SIDE_E2E_OVERRIDABLE_OPTIONS ) );
}

// Off anywhere but a local install (wp-env sets WP_ENVIRONMENT_TYPE to
// "local"), so the plugin does nothing if it ever reaches a shared site.
if ( 'local' === wp_get_environment_type() ) {
	$gtm_server_side_e2e_options = gtm_server_side_e2e_cookie_options();

	foreach ( $gtm_server_side_e2e_options as $gtm_server_side_e2e_name => $gtm_server_side_e2e_value ) {
		add_filter(
			'pre_option_' . $gtm_server_side_e2e_name,
			static function () use ( $gtm_server_side_e2e_value ) {
				return $gtm_server_side_e2e_value;
			}
		);
	}

	// Names the options this request overrides, so the preflight can tell a
	// helper that is off, or an option missing from the list above, from a
	// failing spec.
	if ( $gtm_server_side_e2e_options ) {
		add_action(
			'send_headers',
			static function () use ( $gtm_server_side_e2e_options ) {
				header( 'X-GTM-E2E-Options: ' . implode( ',', array_keys( $gtm_server_side_e2e_options ) ) );
			}
		);
	}
}
