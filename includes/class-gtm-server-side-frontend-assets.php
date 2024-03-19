<?php
/**
 * Assets for admin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Assets for admin.
 */
class GTM_Server_Side_Frontend_Assets {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! GTM_Server_Side_WC_Helpers::instance()->is_enable_ecommerce() ) {
			return;
		}

		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ) );
	}

	/**
	 * Enqueue scripts
	 *
	 * @return void
	 */
	public function wp_enqueue_scripts() {
		wp_enqueue_script( 'gtm-server-side', GTM_SERVER_SIDE_URL . 'assets/js/javascript.js', array( 'jquery' ), get_gtm_server_side_version(), true );

		$scripts = array(
			'currency'                     => esc_attr( get_woocommerce_currency() ),
			'is_custom_event_name'         => GTM_Server_Side_Helpers::get_data_layer_custom_event_name(),
			'DATA_LAYER_CUSTOM_EVENT_NAME' => GTM_SERVER_SIDE_DATA_LAYER_CUSTOM_EVENT_NAME,
		);

		if ( GTM_Server_Side_WC_Helpers::instance()->is_enable_user_data() ) {
			$scripts['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_user_data();
		}

		wp_localize_script( 'gtm-server-side', 'varGtmServerSide', $scripts );
	}
}
