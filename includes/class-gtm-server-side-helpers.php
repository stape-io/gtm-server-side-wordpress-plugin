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
	 * Enable or disable webhook request.
	 *
	 * @var bool
	 */
	private static $is_enable_webhook;

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
	 * Set session.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $value Value.
	 * @return void
	 */
	public static function set_session( $name, $value ) {
		$_SESSION[ $name ] = $value;
	}

	/**
	 * Return session.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $default Default.
	 * @return mixed
	 */
	public static function get_session( $name, $default = null ) {
		if ( ! isset( $_SESSION[ $name ] ) ) {
			return $default;
		}

		return $_SESSION[ $name ];
	}

	/**
	 * Check exists session or not.
	 *
	 * @param  string $name Name.
	 * @param  mixed  $value Value.
	 * @return bool
	 */
	public static function exists_session( $name, $value ) {
		if ( ! isset( $_SESSION[ $name ] ) ) {
			return false;
		}

		return $_SESSION[ $name ] === $value;
	}

	/**
	 * Delete session.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function delete_session( $name ) {
		if ( isset( $_SESSION[ $name ] ) ) {
			unset( $_SESSION[ $name ] );
		}
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
}
