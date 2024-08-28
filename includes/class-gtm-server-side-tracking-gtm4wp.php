<?php
/**
 * The public-facing functionality of the plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * The public-facing functionality of the plugin.
 */
class GTM_Server_Side_Tracking_Gtm4wp {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN !== GTM_Server_Side_Helpers::get_option_container_placement() ) {
			return;
		}

		if ( ! GTM_Server_Side_Helpers::is_plugin_gtm4wp_enabled() ) {
			return;
		}

		add_action( 'init', array( $this, 'wp_init' ) );
		add_filter( 'gtm4wp_get_the_gtm_tag', array( $this, 'gtm4wp_get_the_gtm_tag' ) );

		$priority = 10;
		if ( isset( $GLOBALS['gtm4wp_options'] ) && defined( 'GTM4WP_OPTION_LOADEARLY' ) && function_exists( 'gtm4wp_wp_header_begin' ) && $GLOBALS['gtm4wp_options'][ GTM4WP_OPTION_LOADEARLY ] ) {
			$priority = 2;
		}
		add_action( 'wp_head', array( $this, 'wp_head' ), $priority );
	}

	/**
	 * Hook: init
	 *
	 * @return void
	 */
	public function wp_init() {
		remove_action( 'wp_head', 'gtm4wp_wp_header_begin', 10 );
		remove_action( 'wp_head', 'gtm4wp_wp_header_begin', 2 );
	}

	/**
	 * Hook: wp_head
	 *
	 * @return void
	 */
	public function wp_head() {
		ob_start();

		if ( function_exists( 'gtm4wp_wp_header_begin' ) ) {
			gtm4wp_wp_header_begin();
		}

		echo $this->change_javascript_function( ob_get_clean() ); //phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}

	/**
	 * GTM4WP filter init.
	 *
	 * @param string $html HTML code with iframe.
	 *
	 * @return string
	 */
	public function gtm4wp_get_the_gtm_tag( $html ) {
		$domain = $this->get_gtm_container_domain();
		$id     = GTM_Server_Side_Helpers::get_gtm_container_id();

		if ( ! empty( $domain ) ) {
			$html = str_replace( 'www.googletagmanager.com/', esc_attr( $domain ) . '/', $html );
		}
		if ( ! empty( $id ) ) {
			$html = str_replace( $this->get_gtm4wp_id(), esc_attr( $id ), $html );
		}

		return $html;
	}

	/**
	 * Change function.
	 *
	 * @param  string $html HTML code with js.
	 * @return string
	 */
	private function change_javascript_function( $html ) {
		$domain     = $this->get_gtm_container_domain();
		$identifier = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER );
		$id         = GTM_Server_Side_Helpers::get_gtm_container_id();

		if ( ! empty( $domain ) ) {
			$html = str_replace( 'www.googletagmanager.com/', esc_attr( $domain ) . '/', $html );
		}
		if ( ! empty( $identifier ) ) {
			$html = str_replace( '/gtm.', '/' . esc_attr( $identifier ) . '.', $html );
		}
		if ( ! empty( $id ) ) {
			$html = str_replace( "'" . $this->get_gtm4wp_id() . "'", "'" . esc_attr( $id ) . "'", $html );
		}

		return $html;
	}

	/**
	 * Return gtm4wp id.
	 *
	 * @return string
	 */
	private function get_gtm4wp_id() {
		if ( isset( $GLOBALS['gtm4wp_options'] ) && defined( 'GTM4WP_OPTION_GTM_CODE' ) && $GLOBALS['gtm4wp_options'][ GTM4WP_OPTION_GTM_CODE ] ) {
			return $GLOBALS['gtm4wp_options'][ GTM4WP_OPTION_GTM_CODE ];
		}
		return false;
	}

	/**
	 * Return gtm container domain.
	 *
	 * @return string
	 */
	private function get_gtm_container_domain() {
		$url = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL );
		if ( empty( $url ) ) {
			return null;
		}

		return wp_parse_url( $url, PHP_URL_HOST );
	}
}
