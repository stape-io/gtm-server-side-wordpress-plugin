<?php
/**
 * Plugin Name:       GTM Server Side e2e same-origin baseline
 * Description:       Test-only. Puts the same-origin proxy back the way bin/wp-env-configure.sh sets it up. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * The e2e store keeps the same-origin proxy half set up: on, with its path,
 * but no API key (see "Same-origin" in tests/e2e/README.md). wp-admin can't
 * save that state back: with the proxy on, its form asks for an API key. So a
 * serial test that turned the proxy off in wp-admin gets it back with
 * `/?gtm-e2e-same-origin-baseline=1`, which saves the option as
 * bin/wp-env-configure.sh does. The plugin's own save hook then writes the
 * proxy path's rewrite rule back, at the end of the request.
 *
 * @package GTM_Server_Side_E2E_Same_Origin_Baseline
 */

defined( 'ABSPATH' ) || exit;

/** Query arg of the restoring request. */
const GTM_SERVER_SIDE_E2E_SAME_ORIGIN_BASELINE_QUERY = 'gtm-e2e-same-origin-baseline';

// Off anywhere but a local install, so a visitor can't switch the proxy of a
// shared site on.
// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- test-only, local only.
if ( 'local' === wp_get_environment_type() && isset( $_GET[ GTM_SERVER_SIDE_E2E_SAME_ORIGIN_BASELINE_QUERY ] ) ) {
	add_action(
		'init',
		static function () {
			update_option( 'gtm_server_side_same_origin_enable', 'yes' );
			// Saving the tab with the proxy off stores an empty key, which the
			// baseline doesn't have.
			if ( '' === get_option( 'gtm_server_side_same_origin_api_key', '' ) ) {
				delete_option( 'gtm_server_side_same_origin_api_key' );
			}
			wp_send_json( array( 'enable' => get_option( 'gtm_server_side_same_origin_enable' ) ) );
		},
		0
	);
}
