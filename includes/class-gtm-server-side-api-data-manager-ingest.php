<?php
/**
 * API Data Manager Ingest.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * API Data Manager Ingest.
 */
class GTM_Server_Side_API_Data_Manager_Ingest {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! function_exists( 'WC' ) ) {
			return;
		}

		add_action( 'woocommerce_new_order', array( $this, 'woocommerce_new_order' ), 10, 2 );
	}

	/**
	 * New order create.
	 *
	 * @param  int      $order_id Order id.
	 * @param  WC_Order $order Order.
	 * @return bool
	 */
	public function woocommerce_new_order( $order_id, $order ) {
		remove_action( 'woocommerce_new_order', array( $this, 'woocommerce_new_order' ), 10 );

		if ( empty( GTM_Server_Side_Helpers::get_stape_container_api_key() ) ) {
			return false;
		}

		if ( ! $order instanceof WC_Order ) {
			return false;
		}

		$customer_id = (int) $order->get_customer_id();
		if ( $customer_id > 0 && ! GTM_Server_Side_WC_Helpers::instance()->is_new_customer( $customer_id ) ) {
			return false;
		}

		GTM_Server_Side_Handler_Data_Manager_Ingest::instance()->send_order( $order );
	}
}
