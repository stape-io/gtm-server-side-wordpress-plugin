<?php
/**
 * Data Layer Event: view_item.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: view_item.
 */
class GTM_Server_Side_Event_ViewItem {
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
		if ( ! is_product() ) {
			return;
		}

		global $product;

		if ( ! ( $product instanceof WC_Product ) ) {
			return;
		}

		$data_layer = array(
			'event'          => GTM_Server_Side_Helpers::get_data_layer_event_name( 'view_item' ),
			'ecomm_pagetype' => 'product',
			'ecommerce'      => array(
				'currency' => esc_attr( get_woocommerce_currency() ),
				'value'    => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $product->get_price() ),
				'items'    => array(
					GTM_Server_Side_WC_Helpers::instance()->get_data_layer_item( $product ),
				),
			),
		);

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
