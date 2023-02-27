<?php
/**
 * Webhook Refund.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Webhook Refund.
 */
class GTM_Server_Side_Webhook_Refund {
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

		add_action( 'woocommerce_order_refunded', array( $this, 'woocommerce_order_refunded' ), 10, 2 );
	}

	/**
	 * Create refund
	 *
	 * @param  int $order_id Order id.
	 * @param  int $refund_id Refunded id.
	 * @return void
	 */
	public function woocommerce_order_refunded( $order_id, $refund_id ) {
		if ( ! GTM_Server_Side_Helpers::is_enable_webhook() ) {
			return;
		}

		if ( GTM_SERVER_SIDE_FIELD_VALUE_YES !== GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND ) ) {
			return;
		}

		$order = wc_get_order( $order_id );
		if ( ! ( $order instanceof WC_Order ) ) {
			return;
		}

		$request = array(
			'event'     => 'refund',
			'ecommerce' => array(
				'transaction_id' => $refund_id,
				'value'          => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_total() ),
				'currency'       => esc_attr( $order->get_currency() ),
				'items'          => GTM_Server_Side_WC_Helpers::instance()->get_order_data_layer_items( $order->get_items() ),
			),
			'user_data' => GTM_Server_Side_WC_Helpers::instance()->get_order_user_data( $order ),
		);

		GTM_Server_Side_Helpers::send_webhook_request( $request );
	}
}
