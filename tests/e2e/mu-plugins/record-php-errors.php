<?php
/**
 * Plugin Name:       GTM Server Side e2e PHP error recorder
 * Description:       Test-only. Records the PHP warnings, notices and fatal errors of one e2e test's requests, named by a cookie, so the test can assert there were none. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * debug.log can't answer that question: every test running in parallel writes
 * to it, and so do the REST calls that create their content. This keeps what
 * PHP reported while serving the requests that carry one test's cookie, and
 * hands it out over REST to an administrator (the phpErrors fixture).
 *
 * @package GTM_Server_Side_E2E_Record_PHP_Errors
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the phpErrors fixture sets on one test's browser context: the test's token. */
const GTM_SERVER_SIDE_E2E_PHP_ERRORS_COOKIE = 'gtm_e2e_php_errors';

/** Each request that hit an error stores them in an option named this, the token, and a unique suffix. */
const GTM_SERVER_SIDE_E2E_PHP_ERRORS_OPTION = 'gtm_e2e_php_errors_';

/** What a request records: what debug.log would show as a PHP warning or notice. */
const GTM_SERVER_SIDE_E2E_PHP_ERRORS_LEVELS = E_WARNING | E_NOTICE | E_USER_WARNING | E_USER_NOTICE | E_CORE_WARNING | E_COMPILE_WARNING;

/** What the shutdown check records: an error that ended the request. */
const GTM_SERVER_SIDE_E2E_PHP_FATAL_LEVELS = E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR | E_RECOVERABLE_ERROR;

/** The token from the cookie, or '' when the request carries none. */
function gtm_server_side_e2e_php_errors_token(): string {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, matched against a strict pattern below.
	$token = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_PHP_ERRORS_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_PHP_ERRORS_COOKIE ] : '';

	return preg_match( '/^[a-z0-9-]{1,64}$/', $token ) ? $token : '';
}

/** One line per error, the way debug.log writes it, plus the request it came from. */
function gtm_server_side_e2e_php_error_line( string $level, string $message, string $file, int $line ): string {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, stored for the test to read, never output as HTML.
	$request = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';

	return sprintf( 'PHP %s: %s in %s on line %d (%s)', $level, $message, $file, $line, $request );
}

/**
 * The errors this request has recorded so far. A fatal error ends the request in WordPress's own handler (see
 * gtm_server_side_e2e_php_errors_store()), so they may be stored before the
 * request's last shutdown function runs, or instead of it.
 */
function &gtm_server_side_e2e_php_errors(): array {
	static $errors = array();
	return $errors;
}

/**
 * Stores what this request recorded, once: one option per request, so
 * requests running at the same time never overwrite each other's records.
 * Also records the error that ended the request, if one did.
 */
function gtm_server_side_e2e_php_errors_store( string $token ): void {
	static $stored = false;
	if ( $stored ) {
		return;
	}
	$stored = true;

	$errors = &gtm_server_side_e2e_php_errors();
	$last   = error_get_last();
	if ( $last && ( GTM_SERVER_SIDE_E2E_PHP_FATAL_LEVELS & $last['type'] ) ) {
		$errors[] = gtm_server_side_e2e_php_error_line( 'Fatal error', $last['message'], $last['file'], $last['line'] );
	}

	if ( $errors ) {
		add_option( GTM_SERVER_SIDE_E2E_PHP_ERRORS_OPTION . $token . '_' . wp_generate_uuid4(), $errors, '', false );
	}
}

/** The records stored for a token, oldest first. */
function gtm_server_side_e2e_php_error_options( string $token ): array {
	global $wpdb;

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- test-only, the records have no API of their own.
	return $wpdb->get_col(
		$wpdb->prepare(
			"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s ORDER BY option_id",
			$wpdb->esc_like( GTM_SERVER_SIDE_E2E_PHP_ERRORS_OPTION . $token . '_' ) . '%'
		)
	);
}

// Off anywhere but a local install (wp-env sets WP_ENVIRONMENT_TYPE to
// "local"), so the plugin does nothing if it ever reaches a shared site.
if ( 'local' === wp_get_environment_type() ) {
	$gtm_server_side_e2e_php_errors_token = gtm_server_side_e2e_php_errors_token();

	if ( '' !== $gtm_server_side_e2e_php_errors_token ) {
		// Must-use plugins load before regular ones, so this sees what the
		// plugin under test and WooCommerce report while they load and run.
		$gtm_server_side_e2e_previous_handler = set_error_handler( // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_set_error_handler -- the point of this plugin.
			static function ( $errno, $message, $file = '', $line = 0 ) use ( &$gtm_server_side_e2e_previous_handler ) {
				// What error_reporting() leaves out (an @-silenced call, say)
				// never reaches debug.log either.
				if ( ( error_reporting() & $errno ) && ( GTM_SERVER_SIDE_E2E_PHP_ERRORS_LEVELS & $errno ) ) {
					$level    = ( E_NOTICE | E_USER_NOTICE ) & $errno ? 'Notice' : 'Warning';
					$errors   = &gtm_server_side_e2e_php_errors();
					$errors[] = gtm_server_side_e2e_php_error_line( $level, (string) $message, (string) $file, (int) $line );
				}

				// Then on as if this handler weren't here, so debug.log still gets it.
				return is_callable( $gtm_server_side_e2e_previous_handler )
					? call_user_func( $gtm_server_side_e2e_previous_handler, $errno, $message, $file, $line )
					: false;
			}
		);

		// WordPress registers its fatal error handler as a shutdown function
		// before any plugin loads, and its error page ends in wp_die(), which
		// stops the shutdown functions registered after it - this one. The
		// page's message filter runs first, so store from there too.
		add_filter(
			'wp_php_error_message',
			static function ( $message ) use ( $gtm_server_side_e2e_php_errors_token ) {
				gtm_server_side_e2e_php_errors_store( $gtm_server_side_e2e_php_errors_token );
				return $message;
			}
		);

		register_shutdown_function(
			static function () use ( $gtm_server_side_e2e_php_errors_token ) {
				gtm_server_side_e2e_php_errors_store( $gtm_server_side_e2e_php_errors_token );
			}
		);
	}

	// GET returns what the token's requests recorded; DELETE removes it.
	add_action(
		'rest_api_init',
		static function () {
			register_rest_route(
				'gtm-e2e/v1',
				'/php-errors/(?P<token>[a-z0-9-]{1,64})',
				array(
					array(
						'methods'             => 'GET',
						'permission_callback' => static function () {
							return current_user_can( 'manage_options' );
						},
						'callback'            => static function ( WP_REST_Request $request ) {
							$lines = array();
							foreach ( gtm_server_side_e2e_php_error_options( $request['token'] ) as $name ) {
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
							foreach ( gtm_server_side_e2e_php_error_options( $request['token'] ) as $name ) {
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
