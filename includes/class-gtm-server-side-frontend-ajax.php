<?php
/**
 * Ajax for frontend.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Ajax for frontend.
 */
class GTM_Server_Side_Frontend_Ajax {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( GTM_Server_Side_Helpers::is_enable_data_layer_custom_event_name() ) {
			add_action( 'wp_ajax_gtm_server_side_state_cart_data', array( $this, 'state_cart_data' ) );
			add_action( 'wp_ajax_nopriv_gtm_server_side_state_cart_data', array( $this, 'state_cart_data' ) );
		}
	}

	/**
	 * Ajax for cart data.
	 *
	 * @return void
	 */
	public function state_cart_data() {
		check_ajax_referer( GTM_SERVER_SIDE_AJAX_SECURITY, 'security' );

		if ( function_exists( 'WC' ) && ! WC()->cart ) {
			wp_send_json_error();
		}
		$cart = WC()->cart;
		$data = GTM_Server_Side_State_Helpers::instance()->get_cart_data( $cart );

		wp_send_json_success( $data );
	}
}
