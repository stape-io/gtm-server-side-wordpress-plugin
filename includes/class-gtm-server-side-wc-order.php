<?php
/**
 * WooCommerce order class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce order class.
 */
class GTM_Server_Side_WC_Order {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! GTM_Server_Side_Helpers::is_enable_data_layer_custom_event_name() ) {
			return;
		}

		add_action( 'woocommerce_checkout_create_order', array( $this, 'woocommerce_checkout_create_order' ) );
	}

	/**
	 * Hook: woocommerce_checkout_create_order.
	 *
	 * @param  WC_Order $order Order.
	 * @return void
	 */
	public function woocommerce_checkout_create_order( $order ) {
		if ( ! ( $order instanceof WC_Order ) ) {
			return;
		}

		if ( WC()->session ) {

			$token = WC()->session->get( GTM_Server_Side_State_Helpers::CART_TOKEN_COOKIE );
			if ( ! empty( $token ) ) {

				$order->update_meta_data( GTM_Server_Side_State_Helpers::CART_TOKEN_COOKIE, $token );
				WC()->session->set( GTM_Server_Side_State_Helpers::CART_TOKEN_COOKIE, null );
			}
		}
	}
}
