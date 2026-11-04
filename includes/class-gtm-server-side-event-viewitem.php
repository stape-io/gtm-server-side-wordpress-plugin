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
		add_filter( 'woocommerce_available_variation', array( $this, 'woocommerce_available_variation' ), 10, 3 );
	}

	/**
	 * Hook: woocommerce_available_variation.
	 *
	 * Gives each variation the item assets/js/javascript.js pushes in
	 * view_item once the shopper picks it, built as the page's own view_item
	 * builds the product. The variation data reaches the browser in the form's
	 * markup or, for a product with many variations, from wc-ajax=get_variation,
	 * and both go through this filter. item_variant is left out: the browser
	 * names it from the options the shopper chose, as it does for add_to_cart,
	 * because a variation's own attributes are empty for an "Any …" attribute.
	 *
	 * @param  array                $data      Variation data.
	 * @param  WC_Product           $product   Variable product.
	 * @param  WC_Product_Variation $variation Variation.
	 * @return array
	 */
	public function woocommerce_available_variation( $data, $product, $variation ) {
		if ( ! is_array( $data ) || ! ( $variation instanceof WC_Product ) ) {
			return $data;
		}

		$data['gtm_item'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_item( $variation, array( 'add_variations' => false ) );

		return $data;
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
