<?php
/**
 * Plugin Name:       GTM Server Side e2e option write recorder
 * Description:       Test-only. Records the writes to the plugin's settings made while serving one e2e test's requests, named by a cookie, so the test can assert a setting was kept. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * A test that overrides a setting with storeOptions() keeps its value in a
 * cookie, not the database, so `wp option get` can't tell whether the plugin
 * changed it. This records every update_option(), add_option() and
 * delete_option() call for the settings below on the requests that carry one
 * test's cookie, and hands them out over REST to an administrator (the
 * optionWrites fixture).
 *
 * delete_option() fires no hook for an option the database doesn't hold, so a
 * delete of a setting that is only overridden goes unseen.
 *
 * @package GTM_Server_Side_E2E_Record_Option_Writes
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the optionWrites fixture sets on one test's browser context: the test's token. */
const GTM_SERVER_SIDE_E2E_OPTION_WRITES_COOKIE = 'gtm_e2e_option_writes';

/** Each request that wrote a setting stores the writes in an option named this, the token, and a unique suffix. */
const GTM_SERVER_SIDE_E2E_OPTION_WRITES_OPTION = 'gtm_e2e_option_writes_';

/** The settings whose writes are recorded. */
const GTM_SERVER_SIDE_E2E_RECORDED_OPTIONS = array(
	'gtm_server_side_cookie_keeper',
);

/** The token from the cookie, or '' when the request carries none. */
function gtm_server_side_e2e_option_writes_token(): string {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, matched against a strict pattern below.
	$token = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_OPTION_WRITES_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_OPTION_WRITES_COOKIE ] : '';

	return preg_match( '/^[a-z0-9-]{1,64}$/', $token ) ? $token : '';
}

/** The writes this request has made so far, one line each: `update <option> = <value>`. */
function &gtm_server_side_e2e_option_writes(): array {
	static $writes = array();
	return $writes;
}

/** Adds one write to this request's list. */
function gtm_server_side_e2e_record_option_write( string $action, string $option, $value = null ): void {
	$writes   = &gtm_server_side_e2e_option_writes();
	$writes[] = null === $value ? "$action $option" : "$action $option = " . wp_json_encode( $value );
}

/** The records stored for a token, oldest first. */
function gtm_server_side_e2e_option_write_options( string $token ): array {
	global $wpdb;

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- test-only, the records have no API of their own.
	return $wpdb->get_col(
		$wpdb->prepare(
			"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s ORDER BY option_id",
			$wpdb->esc_like( GTM_SERVER_SIDE_E2E_OPTION_WRITES_OPTION . $token . '_' ) . '%'
		)
	);
}

// Off anywhere but a local install (wp-env sets WP_ENVIRONMENT_TYPE to
// "local"), so the plugin does nothing if it ever reaches a shared site.
if ( 'local' === wp_get_environment_type() ) {
	$gtm_server_side_e2e_option_writes_token = gtm_server_side_e2e_option_writes_token();

	if ( '' !== $gtm_server_side_e2e_option_writes_token ) {
		foreach ( GTM_SERVER_SIDE_E2E_RECORDED_OPTIONS as $gtm_server_side_e2e_recorded ) {
			// Runs on every update_option() call, before WordPress compares the
			// value with the stored one: a write of the same value counts too.
			add_filter(
				'pre_update_option_' . $gtm_server_side_e2e_recorded,
				static function ( $value ) use ( $gtm_server_side_e2e_recorded ) {
					gtm_server_side_e2e_record_option_write( 'update', $gtm_server_side_e2e_recorded, $value );
					return $value;
				}
			);
		}

		add_action(
			'add_option',
			static function ( $option, $value ) {
				if ( in_array( $option, GTM_SERVER_SIDE_E2E_RECORDED_OPTIONS, true ) ) {
					gtm_server_side_e2e_record_option_write( 'add', $option, $value );
				}
			},
			10,
			2
		);

		add_action(
			'delete_option',
			static function ( $option ) {
				if ( in_array( $option, GTM_SERVER_SIDE_E2E_RECORDED_OPTIONS, true ) ) {
					gtm_server_side_e2e_record_option_write( 'delete', $option );
				}
			}
		);

		// One option per request, so requests running at the same time never
		// overwrite each other's records.
		register_shutdown_function(
			static function () use ( $gtm_server_side_e2e_option_writes_token ) {
				$writes = gtm_server_side_e2e_option_writes();
				if ( $writes ) {
					add_option( GTM_SERVER_SIDE_E2E_OPTION_WRITES_OPTION . $gtm_server_side_e2e_option_writes_token . '_' . wp_generate_uuid4(), $writes, '', false );
				}
			}
		);
	}

	// GET returns what the token's requests recorded; DELETE removes it.
	add_action(
		'rest_api_init',
		static function () {
			register_rest_route(
				'gtm-e2e/v1',
				'/option-writes/(?P<token>[a-z0-9-]{1,64})',
				array(
					array(
						'methods'             => 'GET',
						'permission_callback' => static function () {
							return current_user_can( 'manage_options' );
						},
						'callback'            => static function ( WP_REST_Request $request ) {
							$lines = array();
							foreach ( gtm_server_side_e2e_option_write_options( $request['token'] ) as $name ) {
								$lines = array_merge( $lines, (array) get_option( $name, array() ) );
							}
							return rest_ensure_response( $lines );
						},
					),
					array(
						'methods'             => 'DELETE',
						'permission_callback' => static function () {
							return current_user_can( 'manage_options' );
						},
						'callback'            => static function ( WP_REST_Request $request ) {
							foreach ( gtm_server_side_e2e_option_write_options( $request['token'] ) as $name ) {
								delete_option( $name );
							}
							return rest_ensure_response( true );
						},
					),
				)
			);
		}
	);
}
