<?php
/**
 * Plugin Name:       GTM Server Side e2e loader cache
 * Description:       Test-only. Gives one e2e test a loader cache of its own, and reads or clears the loader cache for a test. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * With a Stape container identifier the plugin caches the identifier's random
 * prefix and the encoded Web GTM ID in two transients for a year
 * (GTM_Server_Side_Helpers::get_cache_field()). They are site-wide, and their
 * keys don't depend on the identifier: tests running at the same time would
 * share one cache, and a test that clears it would change the loader URL under
 * the others. So a request carrying this plugin's cookie reads and writes a
 * copy of the two transients kept for that cookie's scope, in an option of
 * its own, and never the shared ones.
 *
 * `/?gtm-e2e-loader-cache=read` answers with the two cached values (null when
 * not set) and `=delete` clears them: the scope's copy for a request with the
 * cookie, the transients themselves without it. `=purge` deletes every
 * scope's copy, the ones killed runs left behind.
 *
 * @package GTM_Server_Side_E2E_Loader_Cache
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the loaderCache.isolate() fixture sets: the test's scope. */
const GTM_SERVER_SIDE_E2E_LOADER_CACHE_COOKIE = 'gtm_e2e_loader_cache';

/** Query arg of the read / delete requests. */
const GTM_SERVER_SIDE_E2E_LOADER_CACHE_QUERY = 'gtm-e2e-loader-cache';

/** The transients get_cache_field() keeps: the identifier and the Web GTM ID, each with `__generated`. */
const GTM_SERVER_SIDE_E2E_LOADER_CACHE_KEYS = array(
	'gtm_server_side_web_identifier__generated',
	'gtm_server_side_web_container_id__generated',
);

/** The scope from the cookie, or '' when the request carries none. */
function gtm_server_side_e2e_loader_cache_scope(): string {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, matched against a strict pattern below.
	$scope = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_LOADER_CACHE_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_LOADER_CACHE_COOKIE ] : '';

	return preg_match( '/^[A-Za-z0-9-]{1,40}$/', $scope ) ? $scope : '';
}

/** The option that holds a scope's copy of the transients, key => value. */
function gtm_server_side_e2e_loader_cache_option( string $scope ): string {
	return 'gtm_e2e_loader_cache_' . $scope;
}

// Off anywhere but a local install, so a visitor can't read or clear the
// cache of a shared site.
if ( 'local' === wp_get_environment_type() ) {
	$gtm_server_side_e2e_loader_cache_scope = gtm_server_side_e2e_loader_cache_scope();

	if ( '' !== $gtm_server_side_e2e_loader_cache_scope ) {
		$gtm_server_side_e2e_loader_cache_option = gtm_server_side_e2e_loader_cache_option( $gtm_server_side_e2e_loader_cache_scope );

		foreach ( GTM_SERVER_SIDE_E2E_LOADER_CACHE_KEYS as $gtm_server_side_e2e_loader_cache_key ) {
			// Whatever the shared transient holds, the scope's copy is the answer:
			// false, "not cached", until this scope generated it.
			add_filter(
				'transient_' . $gtm_server_side_e2e_loader_cache_key,
				static function () use ( $gtm_server_side_e2e_loader_cache_option, $gtm_server_side_e2e_loader_cache_key ) {
					$cache = get_option( $gtm_server_side_e2e_loader_cache_option, array() );

					return $cache[ $gtm_server_side_e2e_loader_cache_key ] ?? false;
				}
			);
			// set_transient() has no way to skip the write, so the value goes to
			// the scope's copy before it, whether or not the shared write then
			// succeeds: tests running at the same time write the same shared
			// row, and a write that loses that race fires no set_transient_<key>.
			add_filter(
				'pre_set_transient_' . $gtm_server_side_e2e_loader_cache_key,
				static function ( $value ) use ( $gtm_server_side_e2e_loader_cache_option, $gtm_server_side_e2e_loader_cache_key ) {
					$cache = get_option( $gtm_server_side_e2e_loader_cache_option, array() );
					$cache[ $gtm_server_side_e2e_loader_cache_key ] = $value;
					update_option( $gtm_server_side_e2e_loader_cache_option, $cache, false );
					return $value;
				}
			);
			// Then the shared transient goes, so no test without a scope reads it.
			add_action(
				'set_transient_' . $gtm_server_side_e2e_loader_cache_key,
				static function () use ( $gtm_server_side_e2e_loader_cache_key ) {
					delete_transient( $gtm_server_side_e2e_loader_cache_key );
				}
			);
		}
	}

	// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- test-only, local only.
	if ( isset( $_GET[ GTM_SERVER_SIDE_E2E_LOADER_CACHE_QUERY ] ) ) {
		add_action(
			'init',
			static function () use ( $gtm_server_side_e2e_loader_cache_scope ) {
				// phpcs:ignore WordPress.Security.NonceVerification.Recommended, WordPress.Security.ValidatedSanitizedInput -- test-only, compared only.
				$action = (string) $_GET[ GTM_SERVER_SIDE_E2E_LOADER_CACHE_QUERY ];
				if ( 'purge' === $action ) {
					global $wpdb;
					// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- test-only, finds the scopes' options by prefix.
					$names = $wpdb->get_col( $wpdb->prepare( "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s", $wpdb->esc_like( 'gtm_e2e_loader_cache_' ) . '%' ) );
					array_map( 'delete_option', $names );
					wp_send_json( array( 'purged' => count( $names ) ) );
				}
				if ( 'delete' === $action ) {
					if ( '' !== $gtm_server_side_e2e_loader_cache_scope ) {
						delete_option( gtm_server_side_e2e_loader_cache_option( $gtm_server_side_e2e_loader_cache_scope ) );
					} else {
						array_map( 'delete_transient', GTM_SERVER_SIDE_E2E_LOADER_CACHE_KEYS );
					}
				}

				$values = array();
				foreach ( GTM_SERVER_SIDE_E2E_LOADER_CACHE_KEYS as $key ) {
					$value          = get_transient( $key );
					$values[ $key ] = false === $value ? null : $value;
				}
				wp_send_json( $values );
			},
			0
		);
	}
}
