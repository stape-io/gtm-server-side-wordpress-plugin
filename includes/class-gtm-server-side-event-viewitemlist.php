<?php
/**
 * Data Layer Event: view_item_list.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: view_item_list.
 */
class GTM_Server_Side_Event_ViewItemList {
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
		if ( ! is_product_category() ) {
			return;
		}

		$category = get_queried_object();
		if ( ! $category instanceof WP_Term ) {
			return;
		}

		$data_layer = array(
			'event'          => GTM_Server_Side_Helpers::get_data_layer_event_name( 'view_item_list' ),
			'ecomm_pagetype' => 'category',
			'ecommerce'      => array(
				'currency' => esc_attr( get_woocommerce_currency() ),
				'items'    => GTM_Server_Side_WC_Helpers::instance()->get_category_data_layer_items( $category->term_id ),
			),
		);

		if ( GTM_Server_Side_WC_Helpers::instance()->should_output_user_data() ) {
			$data_layer['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_user_data();
			echo GTM_SENSITIVE_DATA_NOTICE; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		}
		?>
		<script type="text/javascript">
			dataLayer.push( { ecommerce: null } );
			dataLayer.push(<?php echo GTM_Server_Side_Helpers::array_to_json( $data_layer ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>);
		</script>
		<?php
	}
}
