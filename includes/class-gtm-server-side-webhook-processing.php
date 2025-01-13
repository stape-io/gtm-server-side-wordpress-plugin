<?php
/**
 * Webhook Processing.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Webhook Processing.
 */
class GTM_Server_Side_Webhook_Processing {
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

		add_action( 'woocommerce_order_status_processing', array( $this, 'woocommerce_order_status_processing' ) );
	}

	/**
	 * Order change status to processing.
	 *
	 * @param  int $order_id Order id.
	 * @return void
	 */
	public function woocommerce_order_status_processing( $order_id ) {
		if ( ! GTM_Server_Side_Helpers::is_enable_webhook() ) {
			return;
		}

		if ( GTM_SERVER_SIDE_FIELD_VALUE_YES !== GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING ) ) {
			return;
		}

		$order = wc_get_order( $order_id );
		if ( ! ( $order instanceof WC_Order ) ) {
			return;
		}

		$request = array(
			'event'     => 'order_paid',
			'cart_hash' => $order->get_cart_hash(),
			'ecommerce' => array(
				'transaction_id'  => esc_attr( $order->get_order_number() ),
				'affiliation'     => '',
				'value'           => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_total() ),
				'tax'             => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_total_tax() ),
				'shipping'        => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_shipping_total() ),
				'currency'        => esc_attr( $order->get_currency() ),
				'coupon'          => esc_attr( join( ',', $order->get_coupon_codes() ) ),
				'discount_amount' => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_discount_total() ),
				'items'           => GTM_Server_Side_WC_Helpers::instance()->get_order_data_layer_items( $order->get_items() ),
			),
			'user_data' => GTM_Server_Side_WC_Helpers::instance()->get_order_user_data( $order ),
		);

		$request_cookies = GTM_Server_Side_Helpers::get_request_cookies();

		if ( ! empty( $request_cookies ) ) {
			$request['cookies'] = $request_cookies;

			if ( isset( $request_cookies['_dcid'] ) ) {
				$request['client_id'] = $request_cookies['_dcid'];
			}
		}

		/**
		 * Allows modification of processing order webhook payload.
		 *
		 * @param array  $request Webhook payload data.
		 * @param object $order   WC_Order instance.
		 */
		$request = apply_filters( 'gtm_server_side_processing_webhook_payload', $request, $order );

		GTM_Server_Side_Helpers::send_webhook_request( $request );
	}
}
