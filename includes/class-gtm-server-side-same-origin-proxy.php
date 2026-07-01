<?php
/**
 * Same-Origin Proxy.
 *
 * Registers a WordPress rewrite rule so that requests to the configured
 * path are transparently forwarded to the Stape sGTM container endpoint.
 * Relies entirely on WordPress's native rewrite system — no REQUEST_URI
 * string parsing.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.2.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Same-Origin Proxy handler.
 */
class GTM_Server_Side_Same_Origin_Proxy {
	use GTM_Server_Side_Singleton;

	/**
	 * Query variable that signals a proxy request.
	 */
	const QUERY_VAR = 'gtm_server_side_proxy';

	/**
	 * Query variable that carries the sub-path after the proxy prefix.
	 */
	const PATH_VAR = 'gtm_server_side_proxy_path';

	/**
	 * Allowed HTTP methods for the upstream request.
	 *
	 * @var string[]
	 */
	private static $allowed_methods = array( 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS' );

	/**
	 * Hop-by-hop headers that must not be forwarded to the upstream.
	 *
	 * @var string[]
	 */
	private static $hop_by_hop_request = array(
		'host',
		'connection',
		'keep-alive',
		'proxy-authenticate',
		'proxy-authorization',
		'te',
		'trailer',
		'transfer-encoding',
		'upgrade',
		'expect',
		'content-length',
		'accept-encoding',
	);

	/**
	 * Hop-by-hop headers that must not be forwarded to the browser.
	 *
	 * @var string[]
	 */
	private static $hop_by_hop_response = array(
		'connection',
		'keep-alive',
		'transfer-encoding',
		'content-encoding',
		'content-length',
		'te',
		'trailer',
		'upgrade',
		'x-frame-options',
		'x-content-type-options',
		'referrer-policy',
	);

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'init', array( $this, 'register_rewrite_rule' ) );

		add_filter( 'query_vars', array( $this, 'register_query_vars' ) );
		add_action( 'template_redirect', array( $this, 'handle_request' ), 0 );

		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_ENABLE, array( $this, 'on_option_change' ), 10, 2 );
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_PATH, array( $this, 'on_option_change' ), 10, 2 );
	}

	/**
	 * Dynamically prepend the proxy rewrite rule to the stored rules array.
	 * Hooked to `option_rewrite_rules` so it fires every time WordPress reads
	 * the rewrite rules — guaranteeing the rule is present for parse_request()
	 * without requiring a prior flush.
	 *
	 * @param  mixed $rules Value retrieved from the option.
	 * @return array
	 */
	public function inject_rewrite_rule( $rules ) {
		if ( ! GTM_Server_Side_Helpers::is_enable_same_origin() ) {
			return $rules;
		}

		$raw_path = GTM_Server_Side_Helpers::get_raw_same_origin_path();
		$path     = trim( $raw_path, '/' );
		if ( '' === $path ) {
			return $rules;
		}

		$pattern = '^' . preg_quote( $path, '/' ) . '(/.*)?$';
		$rewrite  = 'index.php?' . self::QUERY_VAR . '=1&' . self::PATH_VAR . '=$matches[1]';

		return array_merge( array( $pattern => $rewrite ), (array) $rules );
	}

	/**
	 * Add the rewrite rule for the proxy path to WordPress's rewrite table.
	 *
	 * Called on every 'init' so extra_rules_top is always populated before
	 * WP::parse_request() runs, making PHP-level routing work immediately
	 * even before flush_rewrite_rules() has been called.
	 *
	 * @return void
	 */
	public function register_rewrite_rule() {
		if ( ! GTM_Server_Side_Helpers::is_enable_same_origin() ) {
			return;
		}

		$raw_path = GTM_Server_Side_Helpers::get_raw_same_origin_path();
		if ( '' === $raw_path ) {
			return;
		}

		// Trim slashes so the regex anchor works correctly regardless of
		// whether the stored path has a leading/trailing slash.
		$path = trim( $raw_path, '/' );
		if ( '' === $path ) {
			return;
		}

		add_rewrite_rule(
			'^' . preg_quote( $path, '/' ) . '(/.*)?$',
			'index.php?' . self::QUERY_VAR . '=1&' . self::PATH_VAR . '=$matches[1]',
			'top'
		);
	}

	/**
	 * Expose our query variables to WordPress.
	 *
	 * @param  string[] $vars Existing public query vars.
	 * @return string[]
	 */
	public function register_query_vars( array $vars ) {
		$vars[] = self::QUERY_VAR;
		$vars[] = self::PATH_VAR;
		return $vars;
	}

	/**
	 * Flush rewrite rules whenever a relevant setting changes so the stored
	 * rewrite_rules option and .htaccess stay in sync.
	 *
	 * @param  mixed $old_value Previous option value.
	 * @param  mixed $new_value New option value.
	 * @return void
	 */
	public function on_option_change( $old_value, $new_value ) {
		if ( $old_value === $new_value ) {
			return;
		}
		$this->register_rewrite_rule();
		flush_rewrite_rules();
	}

	/**
	 * Static helper used by the activation and deactivation hooks to flush
	 * rewrite rules without needing a fully booted singleton.
	 *
	 * @return void
	 */
	public static function flush_rules() {
		$instance = self::instance();
		$instance->register_rewrite_rule();
		flush_rewrite_rules();
	}

	/**
	 * Deactivation handler.
	 *
	 * Flushes rewrite rules after plugin hooks are removed so the persisted
	 * rule set no longer contains the same-origin proxy rewrite.
	 *
	 * @return void
	 */
	public function deactivation() {
		flush_rewrite_rules();
	}

	/**
	 * Route handler — only acts when the proxy query var is set to '1'.
	 *
	 * @return void
	 */
	public function handle_request() {
		if ( '1' !== (string) get_query_var( self::QUERY_VAR ) ) {
			return;
		}

		// Connection test: echo the provided uid as plain text and exit.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$test_uid = isset( $_GET['test-uid'] ) ? sanitize_text_field( wp_unslash( $_GET['test-uid'] ) ) : '';
		if ( '' !== $test_uid ) {
			header( 'Content-Type: text/plain; charset=utf-8' );
			echo esc_html( $test_uid );
			exit;
		}

		if ( ! GTM_Server_Side_Helpers::has_same_origin_settings() ) {
			status_header( 404 );
			exit;
		}

		$endpoint = GTM_Server_Side_Helpers::get_same_origin_endpoint();
		if ( '' === $endpoint ) {
			status_header( 502 );
			exit;
		}

		// Sub-path captured by the rewrite rule, e.g. '/collect' or ''.
		$sub_path              = (string) get_query_var( self::PATH_VAR );
		$is_custom_loader_load = (bool) preg_match( '/\.load$/i', $sub_path );
		$upstream_path         = $is_custom_loader_load
			? (string) preg_replace( '/\.load$/i', '.js', $sub_path )
			: $sub_path;
		$url                   = $endpoint . $upstream_path;

		// Forward the original query string unchanged.
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$qs = isset( $_SERVER['QUERY_STRING'] ) ? (string) $_SERVER['QUERY_STRING'] : '';
		if ( '' !== $qs ) {
			$url .= '?' . $qs;
		}

		$response = wp_remote_request(
			$url,
			array(
				'method'      => $this->get_request_method(),
				'headers'     => $this->get_forward_headers(),
				'body'        => file_get_contents( 'php://input' ), // phpcs:ignore WordPress.WP.AlternativeFunctions
				'timeout'     => 20,
				'redirection' => 0,
				'sslverify'   => true,
			)
		);

		if ( is_wp_error( $response ) ) {
			status_header( 502 );
			exit;
		}

		$status = (int) wp_remote_retrieve_response_code( $response );
		status_header( $status > 0 ? $status : 502 );

		$this->send_response_headers( wp_remote_retrieve_headers( $response ) );

		if ( $is_custom_loader_load ) {
			header( 'Content-Type: application/javascript; charset=utf-8', true );
		}

		// Drain any WordPress output buffers (e.g. ob_gzhandler) so they
		// cannot re-compress the already-decoded upstream body.
		while ( ob_get_level() > 0 ) {
			ob_end_clean();
		}

		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo wp_remote_retrieve_body( $response );
		exit;
	}

	/**
	 * Return the HTTP method for the upstream request, validated against an
	 * allowlist to prevent header injection.
	 *
	 * @return string
	 */
	private function get_request_method() {
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$method = strtoupper( isset( $_SERVER['REQUEST_METHOD'] ) ? (string) $_SERVER['REQUEST_METHOD'] : 'GET' );
		return in_array( $method, self::$allowed_methods, true ) ? $method : 'GET';
	}

	/**
	 * Build the set of request headers to forward upstream.
	 * Removes hop-by-hop headers and adds x-stape-host.
	 *
	 * @return array<string,string>
	 */
	private function get_forward_headers() {
		$all = function_exists( 'getallheaders' ) ? getallheaders() : array();

		$out = array();
		foreach ( $all as $key => $value ) {
			if ( ! in_array( strtolower( $key ), self::$hop_by_hop_request, true ) ) {
				$out[ $key ] = $value;
			}
		}

		$out['x-stape-host'] = (string) wp_parse_url( home_url(), PHP_URL_HOST );

		return $out;
	}

	/**
	 * Forward response headers to the browser, stripping hop-by-hop ones.
	 *
	 * @param  \Requests_Utility_CaseInsensitiveDictionary|array $headers Response headers object.
	 * @return void
	 */
	private function send_response_headers( $headers ) {
		foreach ( $headers as $key => $value ) {
			if ( in_array( strtolower( $key ), self::$hop_by_hop_response, true ) ) {
				continue;
			}
			// Remove any header WordPress (or nginx) already set under this
			// name so we don't emit duplicates.
			header_remove( $key );
			foreach ( (array) $value as $v ) {
				// false = append rather than replace so that multi-value
				// headers such as Set-Cookie are forwarded in full.
				header( $key . ': ' . $v, false );
			}
		}
	}
}
