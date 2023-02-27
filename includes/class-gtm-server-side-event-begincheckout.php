<?php
/**
 * Data Layer Event: begin_checkout.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: begin_checkout.
 */
class GTM_Server_Side_Event_BeginCheckout {
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

		add_action( 'wp_footer', array( $this, 'wp_footer' ) );
	}

	/**
	 * WP footer hook.
	 *
	 * @return void
	 */
	public function wp_footer() {
		if ( ! is_checkout() ) {
			return;
		}

		$cart = WC()->cart->get_cart();
		if ( empty( $cart ) ) {
			return;
		}

		$data_layer = array(
			'event'     => 'begin_checkout',
			'ecommerce' => array(
				'currency' => esc_attr( get_woocommerce_currency() ),
				'value'    => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $this->get_cart_total() ),
				'items'    => $this->get_items( $cart ),
			),
		);

		if ( GTM_Server_Side_WC_Helpers::instance()->is_enable_user_data() ) {
			$data_layer['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_user_data();
		}
		?>
		<script type="text/javascript">
			dataLayer.push(<?php echo GTM_Server_Side_Helpers::array_to_json( $data_layer ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>);
		</script>
		<?php
	}

	/**
	 * Return formatted product itemss from cart to data layer.
	 *
	 * @param  array $cart Cart products.
	 * @return string
	 */
	private function get_items( $cart ) {
		$index  = 1;
		$result = array();
		foreach ( $cart as $product_loop ) {
			$product = $product_loop['data'];

			$array             = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_item( $product );
			$array['quantity'] = intval( $product_loop['quantity'] );
			$array['index']    = $index++;

			$result[] = $array;
		}

		return $result;
	}

	/**
	 * Gets the cart contents total (after calculation).
	 *
	 * @return string formatted price
	 */
	public function get_cart_total() {
		return wc_prices_include_tax() ? WC()->cart->get_cart_contents_total() + WC()->cart->get_cart_contents_tax() : WC()->cart->get_cart_contents_total();
	}
}
