<?php
/**
 * Plugin Name:       GTM Server Side e2e outgoing HTTP recorder
 * Description:       Test-only. Records the HTTP requests WordPress sends while serving one e2e test's requests, named by a cookie, and answers those to test hosts. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * What the plugin sends - a webhook to the sGTM URL, users to Customer Match,
 * a request for the custom loader - goes out from PHP, where the browser
 * can't see it. On a request carrying one test's cookie, this records every
 * wp_remote_*() call (URL, method, headers, body, and what answered it) and
 * hands the records out over REST to an administrator (the outgoingHttp
 * fixture). Each test has its own records, so tests running at the same time
 * never see each other's requests.
 *
 * It runs after every other pre_http_request filter, so the test plugins that
 * answer a host (stub-same-origin-upstream.php, block-stape-api.php) keep
 * answering it, and the record says what they answered. A request to a test
 * host (*.stape.test) that nothing else answered gets an empty 200 here, so
 * it never leaves the machine. Anything else goes on as it would.
 *
 * @package GTM_Server_Side_E2E_Record_Outgoing_HTTP
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the outgoingHttp fixture sets on one test's browser context: the test's token. */
const GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_COOKIE = 'gtm_e2e_outgoing_http';

/** Each request is stored in an option named this, the token, and a unique suffix. */
const GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_OPTION = 'gtm_e2e_outgoing_http_';

/** Hosts under this suffix are the tests' own: answered here when nothing else does. */
const GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_TEST_HOSTS = '.stape.test';

/** The token from the cookie, or '' when the request carries none. */
function gtm_server_side_e2e_outgoing_http_token(): string {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, matched against a strict pattern below.
	$token = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_COOKIE ] : '';

	return preg_match( '/^[a-z0-9-]{1,64}$/', $token ) ? $token : '';
}

/** What answered a request: its status code, the error, or null when it went out to the network. */
function gtm_server_side_e2e_outgoing_http_answer( $preempt ) {
	if ( is_wp_error( $preempt ) ) {
		return $preempt->get_error_message();
	}
	if ( is_array( $preempt ) ) {
		return (int) wp_remote_retrieve_response_code( $preempt );
	}

	return null;
}

/** The records stored for a token (or every token, with ''), oldest first. */
function gtm_server_side_e2e_outgoing_http_options( string $token ): array {
	global $wpdb;

	// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- test-only, the records have no API of their own.
	return $wpdb->get_col(
		$wpdb->prepare(
			"SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s ORDER BY option_id",
			$wpdb->esc_like( GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_OPTION . ( '' === $token ? '' : $token . '_' ) ) . '%'
		)
	);
}

// Off anywhere but a local install (wp-env sets WP_ENVIRONMENT_TYPE to
// "local"), so the plugin does nothing if it ever reaches a shared site.
if ( 'local' === wp_get_environment_type() ) {
	$gtm_server_side_e2e_outgoing_http_token = gtm_server_side_e2e_outgoing_http_token();

	if ( '' !== $gtm_server_side_e2e_outgoing_http_token ) {
		add_filter(
			'pre_http_request',
			static function ( $preempt, $args, $url ) use ( $gtm_server_side_e2e_outgoing_http_token ) {
				$host = (string) wp_parse_url( $url, PHP_URL_HOST );
				if ( false === $preempt && GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_TEST_HOSTS === substr( $host, -strlen( GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_TEST_HOSTS ) ) ) {
					$preempt = array(
						'headers'  => array(),
						'body'     => '',
						'response' => array(
							'code'    => 200,
							'message' => 'OK',
						),
						'cookies'  => array(),
						'filename' => null,
					);
				}

				// One option per request sent, so the requests of one test that
				// run at the same time never overwrite each other's records.
				add_option(
					GTM_SERVER_SIDE_E2E_OUTGOING_HTTP_OPTION . $gtm_server_side_e2e_outgoing_http_token . '_' . wp_generate_uuid4(),
					array(
						'url'     => $url,
						'method'  => $args['method'] ?? 'GET',
						'headers' => $args['headers'] ?? array(),
						'body'    => $args['body'] ?? null,
						'answer'  => gtm_server_side_e2e_outgoing_http_answer( $preempt ),
					),
					'',
					false
				);

				return $preempt;
			},
			PHP_INT_MAX,
			3
		);
	}

	// GET returns what the token's requests sent, oldest first; DELETE removes
	// it. DELETE without a token removes every test's: the preflight's purge of
	// what killed runs left behind.
	add_action(
		'rest_api_init',
		static function () {
			$is_admin = static function () {
				return current_user_can( 'manage_options' );
			};
			$delete   = static function ( WP_REST_Request $request ) {
				foreach ( gtm_server_side_e2e_outgoing_http_options( (string) ( $request['token'] ?? '' ) ) as $name ) {
					delete_option( $name );
				}
				return rest_ensure_response( true );
			};
			register_rest_route(
				'gtm-e2e/v1',
				'/outgoing-http/(?P<token>[a-z0-9-]{1,64})',
				array(
					array(
						'methods'             => 'GET',
						'permission_callback' => $is_admin,
						'callback'            => static function ( WP_REST_Request $request ) {
							return rest_ensure_response(
								array_map( 'get_option', gtm_server_side_e2e_outgoing_http_options( $request['token'] ) )
							);
						},
					),
					array(
						'methods'             => 'DELETE',
						'permission_callback' => $is_admin,
						'callback'            => $delete,
					),
				)
			);
			register_rest_route(
				'gtm-e2e/v1',
				'/outgoing-http',
				array(
					'methods'             => 'DELETE',
					'permission_callback' => $is_admin,
					'callback'            => $delete,
				)
			);
		}
	);
}
