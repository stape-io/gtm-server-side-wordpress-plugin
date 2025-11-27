<?php
/**
 * Data Layer Event: view_cart.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: view_cart.
 */
class GTM_Server_Side_Event_ViewCart {
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
		if ( ! is_cart() ) {
			return;
		}

		$cart = WC()->cart->get_cart();
		if ( empty( $cart ) ) {
			return;
		}

		$data_layer = array(
			'event'          => GTM_Server_Side_Helpers::get_data_layer_event_name( 'view_cart' ),
			'ecomm_pagetype' => 'basket',
			'cart_quantity'  => count( $cart ),
			'cart_total'     => GTM_Server_Side_WC_Helpers::instance()->formatted_price(
				GTM_Server_Side_WC_Helpers::instance()->get_cart_total()
			),
			'ecommerce'      => array(
				'currency' => esc_attr( get_woocommerce_currency() ),
				'items'    => GTM_Server_Side_WC_Helpers::instance()->get_cart_data_layer_items( $cart ),
			),
		);

		if ( GTM_Server_Side_Helpers::is_enable_data_layer_custom_event_name() ) {
			$data_layer['cart_state'] = GTM_Server_Side_State_Helpers::instance()->get_cart_data( WC()->cart );
		}

		if ( GTM_Server_Side_WC_Helpers::instance()->is_enable_user_data() ) {
			$data_layer['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_user_data();
		}
		?>
		<script type="text/javascript">
			dataLayer.push( { ecommerce: null } );
			dataLayer.push(<?php echo GTM_Server_Side_Helpers::array_to_json( $data_layer ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>);
		</script>
		<?php
	}
}
