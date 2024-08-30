<?php
/**
 * Webhook Purchase.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Webhook Purchase.
 */
class GTM_Server_Side_Webhook_Purchase {
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
	 * @param  WC_Order $order Order id.
	 * @return void
	 */
	public function woocommerce_new_order( $order_id, $order ) {
		if ( ! GTM_Server_Side_Helpers::is_enable_webhook() ) {
			return;
		}

		if ( GTM_SERVER_SIDE_FIELD_VALUE_YES !== GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE ) ) {
			return;
		}

		if ( ! ( $order instanceof WC_Order ) ) {
			return;
		}

		$request                              = array(
			'event'     => 'purchase',
			'ecommerce' => array(
				'transaction_id' => esc_attr( $order->get_order_number() ),
				'affiliation'    => '',
				'value'          => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_total() ),
				'tax'            => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_total_tax() ),
				'shipping'       => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_shipping_total() ),
				'currency'       => esc_attr( $order->get_currency() ),
				'coupon'         => esc_attr( join( ',', $order->get_coupon_codes() ) ),
				'items'          => GTM_Server_Side_WC_Helpers::instance()->get_order_data_layer_items( $order->get_items() ),
			),
			'user_data' => GTM_Server_Side_WC_Helpers::instance()->get_order_user_data( $order ),
		);
		$request['user_data']['new_customer'] = GTM_Server_Side_WC_Helpers::instance()->is_new_customer( $order->get_customer_id() ) ? 'true' : 'false';
		$request_cookies                      = GTM_Server_Side_Helpers::get_request_cookies();

		if ( ! empty( $request_cookies ) ) {
			$request['cookies'] = $request_cookies;

			if ( isset( $request_cookies['_dcid'] ) ) {
				$request['client_id'] = $request_cookies['_dcid'];
			}
		}

		GTM_Server_Side_Helpers::send_webhook_request( $request );
	}
}
