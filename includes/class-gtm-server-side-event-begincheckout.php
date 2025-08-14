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
		if ( ! GTM_Server_Side_Helpers::can_output_sensitive_data() ) {
			return;
		}

		if ( ! is_checkout() ) {
			return;
		}

		$cart = WC()->cart->get_cart();
		if ( empty( $cart ) ) {
			return;
		}

		$data_layer = array(
			'event'          => GTM_Server_Side_Helpers::get_data_layer_event_name( 'begin_checkout' ),
			'ecomm_pagetype' => 'basket',
			'ecommerce'      => array(
				'currency' => esc_attr( get_woocommerce_currency() ),
				'value'    => GTM_Server_Side_WC_Helpers::instance()->formatted_price(
					GTM_Server_Side_WC_Helpers::instance()->get_cart_total()
				),
				'items'    => GTM_Server_Side_WC_Helpers::instance()->get_cart_data_layer_items( $cart ),
			),
		);

		if ( GTM_Server_Side_WC_Helpers::instance()->should_output_user_data() ) {
			$data_layer['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_user_data();
		}
		echo GTM_SENSITIVE_DATA_NOTICE; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		?>
		<script type="text/javascript">
			dataLayer.push( { ecommerce: null } );
			dataLayer.push(<?php echo GTM_Server_Side_Helpers::array_to_json( $data_layer ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>);
		</script>
		<?php
	}
}
