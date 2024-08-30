<?php
/**
 * Helper class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * Helper class.
 */
class GTM_Server_Side_Helpers {
	/**
	 * Enable or disable data layer ecommerce.
	 *
	 * @var bool
	 */
	private static $is_enable_data_layer_ecommerce;

	/**
	 * Enable or disable data layer user data.
	 *
	 * @var bool
	 */
	private static $is_enable_data_layer_user_data;

	/**
	 * Enable or disable data layer custom event name.
	 *
	 * @var bool
	 */
	private static $is_enable_data_layer_custom_event_name;

	/**
	 * Enable or disable webhook request.
	 *
	 * @var bool
	 */
	private static $is_enable_webhook;

	/**
	 * Enable or disable cookie keeper.
	 *
	 * @var bool
	 */
	private static $is_enable_cookie_keeper;

	/**
	 * Get attr option.
	 *
	 * @param string $option The option ID.
	 *
	 * @return string|bool
	 */
	public static function get_option( $option ) {
		return get_option( $option, false );
	}

	/**
	 * Return option container placement
	 *
	 * @return string
	 */
	public static function get_option_container_placement() {
		return self::get_option( GTM_SERVER_SIDE_FIELD_PLACEMENT );
	}

	/**
	 * Return GTM web container ID.
	 *
	 * @return string
	 */
	public static function get_gtm_container_id() {
		return self::get_option( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID );
	}

	/**
	 * Return filtering GTM web container ID.
	 *
	 * @return string
	 */
	public static function get_gtm_filtering_container_id() {
		$container_id = self::get_gtm_container_id();

		if ( self::has_gtm_container_identifier() ) {
			$container_id = preg_replace( '/^GTM\-/i', '', $container_id );
		}

		return $container_id;
	}

	/**
	 * Return GTM web container url.
	 *
	 * @return string
	 */
	public static function get_gtm_container_url() {
		$url = self::get_option( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL );

		if ( empty( $url ) ) {
			return 'https://www.googletagmanager.com';
		}

		return $url;
	}

	/**
	 * Return data layer custom event name.
	 *
	 * @return string
	 */
	public static function get_data_layer_custom_event_name() {
		return self::get_option( GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME );
	}

	/**
	 * Check has gtm container identifier or not.
	 *
	 * @return bool
	 */
	public static function has_gtm_container_identifier() {
		return ! empty( self::get_option( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER ) );
	}

	/**
	 * Return GTM identifier.
	 *
	 * @return string
	 */
	public static function get_gtm_container_identifier() {
		$identifier = self::get_option( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER );

		if ( empty( $identifier ) ) {
			return 'gtm';
		}

		return $identifier;
	}

	/**
	 * Return GTM param id.
	 *
	 * @return string
	 */
	public static function get_gtm_param_id() {
		if ( self::has_gtm_container_identifier() ) {
			return 'st';
		}

		return 'id';
	}

	/**
	 * Enable or disable data layer ecommerce.
	 *
	 * @return string
	 */
	public static function is_enable_data_layer_ecommerce() {
		if ( null === static::$is_enable_data_layer_ecommerce ) {
			static::$is_enable_data_layer_ecommerce = GTM_SERVER_SIDE_FIELD_VALUE_YES === self::get_option( GTM_SERVER_SIDE_FIELD_DATA_LAYER_ECOMMERCE );
		}

		return static::$is_enable_data_layer_ecommerce;
	}

	/**
	 * Enable or disable data layer user data.
	 *
	 * @return string
	 */
	public static function is_enable_data_layer_user_data() {
		if ( null === static::$is_enable_data_layer_user_data ) {
			static::$is_enable_data_layer_user_data = GTM_SERVER_SIDE_FIELD_VALUE_YES === self::get_option( GTM_SERVER_SIDE_FIELD_DATA_LAYER_USER_DATA );
		}

		return static::$is_enable_data_layer_user_data;
	}

	/**
	 * Enable or disable data layer custom event name.
	 *
	 * @return string
	 */
	public static function is_enable_data_layer_custom_event_name() {
		if ( null === static::$is_enable_data_layer_custom_event_name ) {
			static::$is_enable_data_layer_custom_event_name = GTM_SERVER_SIDE_FIELD_VALUE_YES === self::get_data_layer_custom_event_name();
		}

		return static::$is_enable_data_layer_custom_event_name;
	}

	/**
	 * Enable or disable webhook request.
	 *
	 * @return string
	 */
	public static function is_enable_webhook() {
		if ( null === static::$is_enable_webhook ) {
			static::$is_enable_webhook = GTM_SERVER_SIDE_FIELD_VALUE_YES === self::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_ENABLE );
		}

		return static::$is_enable_webhook;
	}

	/**
	 * Enable or disable cookie keeper.
	 *
	 * @return string
	 */
	public static function is_enable_cookie_keeper() {
		if ( null === static::$is_enable_cookie_keeper ) {
			static::$is_enable_cookie_keeper = GTM_SERVER_SIDE_FIELD_VALUE_YES === self::get_option( GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER );
		}

		return static::$is_enable_cookie_keeper;
	}

	/**
	 * Set session.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $value Value.
	 * @return void
	 */
	public static function set_session( $name, $value ) {
		self::set_cookie(
			array(
				'name'     => $name,
				'value'    => $value,
				'secure'   => false,
				'samesite' => '',
			)
		);
	}

	/**
	 * Return session.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $default Default.
	 * @return mixed
	 */
	public static function get_session( $name, $default = null ) {
		if ( ! isset( $_COOKIE[ $name ] ) ) {
			return $default;
		}

		return filter_input( INPUT_COOKIE, $name, FILTER_DEFAULT );
	}

	/**
	 * Check exists session or not.
	 *
	 * @param  string $name Name.
	 * @param  mixed  $value Value.
	 * @return bool
	 */
	public static function exists_session( $name, $value ) {
		if ( ! isset( $_COOKIE[ $name ] ) ) {
			return false;
		}

		return $_COOKIE[ $name ] === $value;
	}

	/**
	 * Delete session.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function delete_session( $name ) {
		if ( isset( $_COOKIE[ $name ] ) ) {
			self::delete_cookie( $name );
		}
	}

	/**
	 * Set cookie.
	 *
	 * @param  array $args Parameters.
	 * @return void
	 */
	public static function set_cookie( $args ) {
		$args = wp_parse_args(
			$args,
			self::get_default_cookie_options()
		);

		if ( version_compare( PHP_VERSION, '7.3.0', '>=' ) ) {
			$name  = $args['name'];
			$value = $args['value'];

			unset( $args['name'] );
			unset( $args['value'] );

			setcookie(
				$name,
				$value,
				$args,
			);
		} else {
			setcookie(
				$args['name'],
				$args['value'],
				$args['expires'],
				$args['path'],
				$args['domain'],
				$args['secure'],
				$args['httponly']
			);
		}
	}

	/**
	 * Delete cookie.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function delete_cookie( $name ) {
		self::set_cookie(
			array(
				'name'    => $name,
				'value'   => '',
				'expires' => -1,
			)
		);
		unset( $_COOKIE[ $name ] );
	}

	/**
	 * Return default cookie options.
	 *
	 * @return array
	 */
	private static function get_default_cookie_options() {
		return array(
			'name'     => '',
			'value'    => '',
			'expires'  => 0,
			'path'     => '/',
			'domain'   => '.' . wp_parse_url( home_url(), PHP_URL_HOST ),
			'secure'   => true,
			'httponly' => false,
			'samesite' => 'lax',
		);
	}

	/**
	 * Delete cookie using javascript.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function javascript_delete_cookie( $name ) {
		$options = self::get_default_cookie_options();
		?>
			<script>
				document.cookie = '<?php echo esc_attr( $name ); ?>=; max-age=-1; path=<?php echo esc_attr( $options['path'] ); ?>; domain=<?php echo esc_attr( $options['domain'] ); ?>;';
			</script>
		<?php
	}

	/**
	 * Sanitize bool.
	 *
	 * @param  string $value Bool.
	 * @return string
	 */
	public static function sanitize_bool( $value ) {
		return 'yes' === $value ? 'yes' : '';
	}

	/**
	 * Check if GTM plugin is enabled.
	 *
	 * @return bool
	 */
	public static function is_plugin_gtm4wp_enabled() {
		self::include_functions_plugin();

		return is_plugin_active( 'duracelltomi-google-tag-manager/duracelltomi-google-tag-manager-for-wordpress.php' );
	}

	/**
	 * Check if WooCommerce plugin is enabled.
	 *
	 * @return bool
	 */
	public static function is_plugin_wc_enabled() {
		self::include_functions_plugin();

		return is_plugin_active( 'woocommerce/woocommerce.php' );
	}

	/**
	 * Include functions plugin
	 *
	 * @return void
	 */
	private static function include_functions_plugin() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
	}

	/**
	 * Return maybe in json format or not
	 *
	 * @param  mixed $data Data.
	 * @return mixed
	 */
	public static function array_to_json( $data ) {
		return wp_json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION );
	}

	/**
	 * Send request to webhook.
	 *
	 * @param  array $body post data.
	 * @return array|false|WP_Error The response or WP_Error on failure.
	 */
	public static function send_webhook_request( $body ) {
		$container_url = self::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL );
		if ( empty( $container_url ) ) {
			return false;
		}

		return wp_remote_post(
			$container_url,
			array(
				'headers' => array(
					'cache-control' => 'no-cache',
					'content-type'  => 'application/json',
				),
				'body'    => wp_json_encode( $body ),
			)
		);
	}

	/**
	 * Return data layer event name.
	 *
	 * @param  string $event_name Event name.
	 * @return string
	 */
	public static function get_data_layer_event_name( $event_name ) {
		if ( self::is_enable_data_layer_custom_event_name() ) {
			return $event_name . GTM_SERVER_SIDE_DATA_LAYER_CUSTOM_EVENT_NAME;
		}
		return $event_name;
	}

	/**
	 * Return request cookies.
	 *
	 * @return array
	 */
	public static function get_request_cookies() {
		$request_cookies = array(
			'_fbp'         => filter_input( INPUT_COOKIE, '_fbp', FILTER_DEFAULT ),
			'_fbc'         => filter_input( INPUT_COOKIE, '_fbc', FILTER_DEFAULT ),
			'FPGCLAW'      => filter_input( INPUT_COOKIE, 'FPGCLAW', FILTER_DEFAULT ),
			'_gcl_aw'      => filter_input( INPUT_COOKIE, '_gcl_aw', FILTER_DEFAULT ),
			'ttclid'       => filter_input( INPUT_COOKIE, 'ttclid', FILTER_DEFAULT ),
			'_dcid'        => filter_input( INPUT_COOKIE, '_dcid', FILTER_DEFAULT ),
			'FPID'         => filter_input( INPUT_COOKIE, 'FPID', FILTER_DEFAULT ),
			'FPLC'         => filter_input( INPUT_COOKIE, 'FPLC', FILTER_DEFAULT ),
			'_ttp'         => filter_input( INPUT_COOKIE, '_ttp', FILTER_DEFAULT ),
			'FPGCLGB'      => filter_input( INPUT_COOKIE, 'FPGCLGB', FILTER_DEFAULT ),
			'li_fat_id'    => filter_input( INPUT_COOKIE, 'li_fat_id', FILTER_DEFAULT ),
			'taboola_cid'  => filter_input( INPUT_COOKIE, 'taboola_cid', FILTER_DEFAULT ),
			'outbrain_cid' => filter_input( INPUT_COOKIE, 'outbrain_cid', FILTER_DEFAULT ),
			'impact_cid'   => filter_input( INPUT_COOKIE, 'impact_cid', FILTER_DEFAULT ),
			'_epik'        => filter_input( INPUT_COOKIE, '_epik', FILTER_DEFAULT ),
			'_scid'        => filter_input( INPUT_COOKIE, '_scid', FILTER_DEFAULT ),
			'_scclid'      => filter_input( INPUT_COOKIE, '_scclid', FILTER_DEFAULT ),
			'_uetmsclkid'  => filter_input( INPUT_COOKIE, '_uetmsclkid', FILTER_DEFAULT ),
			'_ga'          => filter_input( INPUT_COOKIE, '_ga', FILTER_DEFAULT ),
		);

		if ( ! empty( $_COOKIE ) ) {
			$filtered_cookies = array_filter(
				$_COOKIE,
				function( $key ) {
					return preg_match( '/^_ga_.+/', $key );
				},
				ARRAY_FILTER_USE_KEY
			);

			$request_cookies = array_merge( $request_cookies, $filtered_cookies );
		}

		$request_cookies = array_filter( $request_cookies );

		return $request_cookies;
	}
}
