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
 * @since      2.3.0
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
	 * Whether a rewrite-rules flush has already been scheduled for shutdown.
	 *
	 * @var bool
	 */
	private $flush_scheduled = false;

	/**
	 * Allowed HTTP methods for the upstream request.
	 *
	 * @var string[]
	 */
	private static $allowed_methods = array( 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS' );

	/**
	 * HTTP methods that carry a request body and should forward one upstream.
	 * DELETE is included since some APIs accept a DELETE payload.
	 *
	 * @var string[]
	 */
	private static $body_methods = array( 'POST', 'PUT', 'PATCH', 'DELETE' );

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
	);

	/**
	 * Security response headers deliberately stripped from the upstream reply.
	 *
	 * @var string[]
	 */
	private static $stripped_security_response = array(
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
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_API_KEY, array( $this, 'on_option_change' ), 10, 2 );
	}

	/**
	 * Add the rewrite rule for the proxy path to WordPress's rewrite table.
	 *
	 * @return void
	 */
	public function register_rewrite_rule() {
		if ( ! GTM_Server_Side_Helpers::is_same_origin_path_active() ) {
			return;
		}

		// Trim slashes so the regex anchor works correctly regardless of
		// whether the stored path has a leading/trailing slash.
		$path = trim( GTM_Server_Side_Helpers::get_raw_same_origin_path(), '/' );

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
		$this->schedule_flush();
	}

	/**
	 * Schedule a single rewrite-rules flush to run once on `shutdown`,
	 * regardless of how many option changes occur during the request.
	 *
	 * @return void
	 */
	private function schedule_flush() {
		if ( $this->flush_scheduled ) {
			return;
		}
		$this->flush_scheduled = true;
		add_action( 'shutdown', array( $this, 'do_scheduled_flush' ) );
	}

	/**
	 * Perform the debounced flush. Re-registers the rewrite rule first so the
	 * regenerated rule set reflects the just-saved options (e.g. when the
	 * feature was enabled during this request, after 'init' already ran).
	 *
	 * @return void
	 */
	public function do_scheduled_flush() {
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

		if ( ! GTM_Server_Side_Helpers::is_enable_same_origin() ) {
			return;
		}

		// Connection test: echo the provided uid as plain text and exit.
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		$test_uid = isset( $_GET['test-uid'] ) ? sanitize_text_field( wp_unslash( $_GET['test-uid'] ) ) : '';
		if ( '' !== $test_uid ) {
			header( 'Content-Type: text/plain; charset=utf-8' );
			header( 'Cache-Control: no-store' );
			header( 'X-Content-Type-Options: nosniff' );
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
				'body'        => $this->get_request_body(),
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
	 * Read the raw request body, but only for methods that carry one.
	 *
	 * @return string|null  Raw body for body-bearing methods, null otherwise.
	 */
	private function get_request_body() {
		if ( ! in_array( $this->get_request_method(), self::$body_methods, true ) ) {
			return null;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions
		return file_get_contents( 'php://input' );
	}

	/**
	 * Build the set of request headers to forward upstream.
	 * Removes hop-by-hop headers and adds x-stape-host.
	 *
	 * @return array<string,string>
	 */
	private function get_forward_headers() {
		$all = function_exists( 'getallheaders' ) ? getallheaders() : $this->get_headers_from_server();

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
	 * Reconstruct request headers from $_SERVER for SAPIs where
	 * getallheaders() isn't available (e.g. some CGI/FastCGI setups).
	 *
	 * @return array<string,string>
	 */
	private function get_headers_from_server() {
		$headers = array();
		foreach ( $_SERVER as $key => $value ) {
			if ( 0 === strpos( $key, 'HTTP_' ) ) {
				$headers[ str_replace( '_', '-', substr( $key, 5 ) ) ] = $value;
			} elseif ( in_array( $key, array( 'CONTENT_TYPE', 'CONTENT_LENGTH', 'CONTENT_MD5' ), true ) ) {
				$headers[ str_replace( '_', '-', $key ) ] = $value;
			}
		}
		return $headers;
	}

	/**
	 * Forward response headers to the browser, stripping hop-by-hop ones.
	 *
	 * @param  \Requests_Utility_CaseInsensitiveDictionary|array $headers Response headers object.
	 * @return void
	 */
	private function send_response_headers( $headers ) {
		$has_get_values = is_object( $headers ) && method_exists( $headers, 'getValues' );

		foreach ( $headers as $key => $value ) {
			$lower = strtolower( $key );
			if ( in_array( $lower, self::$hop_by_hop_response, true )
				|| in_array( $lower, self::$stripped_security_response, true ) ) {
				continue;
			}

			$values = $has_get_values ? (array) $headers->getValues( $key ) : (array) $value;

			// Remove any header WordPress (or nginx) already set under this
			// name so we don't emit duplicates.
			header_remove( $key );
			foreach ( $values as $v ) {
				if ( 'set-cookie' === $lower ) {
					$v = $this->strip_cookie_domain( $v );
				}
				// false = append rather than replace so that multi-value
				// headers such as Set-Cookie are forwarded in full.
				header( $key . ': ' . $v, false );
			}
		}
	}

	/**
	 * Strip the Domain= attribute from a Set-Cookie header value.
	 *
	 * @param  string $cookie Raw Set-Cookie header value.
	 * @return string
	 */
	private function strip_cookie_domain( $cookie ) {
		return preg_replace( '/;\s*Domain=[^;]*/i', '', $cookie );
	}
}
