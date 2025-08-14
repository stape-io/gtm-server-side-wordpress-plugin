<?php
/**
 * Data Layer Event: purchase.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: purchase.
 */
class GTM_Server_Side_Event_Purchase {
	use GTM_Server_Side_Singleton;

	/**
	 * Session transaction key.
	 *
	 * @var string
	 */
	const TRANSACTION_KEY = 'gtm_server_side_order_id';

	/**
	 * Check order created or not.
	 *
	 * @var bool
	 */
	private $is_order_created = false;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! GTM_Server_Side_WC_Helpers::instance()->is_enable_ecommerce() ) {
			return;
		}

		add_action( 'woocommerce_new_order', array( $this, 'woocommerce_new_order' ) );
		add_action( 'woocommerce_thankyou', array( $this, 'woocommerce_new_order' ) );
		add_action( 'wp_footer', array( $this, 'wp_footer' ) );
	}

	/**
	 * New order create.
	 *
	 * @param  int $order_id Order id.
	 * @return void
	 */
	public function woocommerce_new_order( $order_id ) {
		if ( $this->is_order_created ) {
			return;
		}
		$this->is_order_created = true;

		GTM_Server_Side_Helpers::set_session( self::TRANSACTION_KEY, $order_id );
	}

	/**
	 * WP footer hook.
	 *
	 * @return void
	 */
	public function wp_footer() {
		/* phpcs:ignore
		if ( ! is_wc_endpoint_url( 'order-received' ) ) {
			return;
		}
		*/

		$order_id = GTM_Server_Side_Helpers::get_session( self::TRANSACTION_KEY );
		if ( empty( $order_id ) ) {
			return;
		}

		$order = wc_get_order( $order_id );
		if ( ! ( $order instanceof WC_Order ) ) {
			return;
		}

		$data_layer = array(
			'event'          => GTM_Server_Side_Helpers::get_data_layer_event_name( 'purchase' ),
			'ecomm_pagetype' => 'purchase',
			'ecommerce'      => array(
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
		);

		if ( GTM_Server_Side_WC_Helpers::instance()->is_enable_user_data() ) {
			$data_layer['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_order_user_data( $order );

			$customer_id                             = (int) $order->get_customer_id();
			$data_layer['user_data']['new_customer'] = 'true';

			if ( $customer_id > 0 && ! GTM_Server_Side_WC_Helpers::instance()->is_new_customer( $customer_id ) ) {
				$data_layer['user_data']['new_customer'] = 'false';
			}
		}
		?>
		<script type="text/javascript">
			dataLayer.push( { ecommerce: null } );
			dataLayer.push(<?php echo GTM_Server_Side_Helpers::array_to_json( $data_layer ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>);
		</script>
		<?php
		GTM_Server_Side_Helpers::javascript_delete_cookie( self::TRANSACTION_KEY );
	}
}
