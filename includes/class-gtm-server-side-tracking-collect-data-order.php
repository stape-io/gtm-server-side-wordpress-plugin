<?php
/**
 * Measurement Protocol Integration
 *
 * @since      1.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @file       class-gtm-server-side-tracking-collect-data-order.php
 */

/**
 * Measurement class.
 */
class GTM_Server_Side_Tracking_Collect_Data_Order {

	/**
	 * Order ID.
	 *
	 * @var int $order_id
	 */
	private $order_id;

	/**
	 * Order.
	 *
	 * @var mixed $order
	 */
	private $order;

	/**
	 * Order items.
	 *
	 * @param int $order_id Order ID.
	 */
	public function __construct( $order_id ) {
		$this->order_id = $order_id;
		if ( function_exists( 'wc_get_order' ) ) {
			$this->order = wc_get_order( $this->order_id );
		} else {
			$this->order = new stdClass();
		}
	}

	/**
	 * Get order id.
	 *
	 * @return int
	 */
	public function get_order_id() {
		return $this->order_id;
	}

	/**
	 * Get revenue.
	 *
	 * @return string
	 */
	public function get_revenue() {
		if ( ! method_exists( $this->order, 'get_total' ) ) {
			return '0';
		}
		return $this->format_number( $this->order->get_total() );
	}

	/**
	 * Get tax.
	 *
	 * @return string
	 */
	public function get_tax() {
		if ( ! method_exists( $this->order, 'get_total_tax' ) ) {
			return '0';
		}
		return $this->format_number( $this->order->get_total_tax() );
	}

	/**
	 * Get shipping.
	 *
	 * @return string
	 */
	public function get_shipping() {
		if ( ! method_exists( $this->order, 'get_shipping_total' ) || ! method_exists( $this->order, 'get_shipping_tax' ) ) {
			return '0';
		}
		$shipping_cost = $this->order->get_shipping_total() + $this->order->get_shipping_tax();

		return $this->format_number( $shipping_cost );
	}

	/**
	 * Get product action.
	 *
	 * @return string
	 */
	public function get_product_action() {
		return 'purchase';
	}

	/**
	 * Get the coupon codes.
	 *
	 * @return string|null
	 */
	public function get_coupon_code() {
		if ( ! method_exists( $this->order, 'get_used_coupons' ) ) {
			return '0';
		}

		$order_coupons = $this->order->get_used_coupons();
		if ( ! is_array( $order_coupons ) || count( $order_coupons ) === 0 ) {
			return null;
		}

		$coupon_codes = '';
		foreach ( $order_coupons as $coupon_name ) {
			$coupon_codes .= $coupon_name . '||';
		}

		return mb_substr( $coupon_codes, 0, -2 );
	}

	/**
	 * Get the order items.
	 *
	 * @return array|string
	 */
	public function get_order_items() {
		if ( ! method_exists( $this->order, 'get_items' ) ) {
			return '0';
		}
		$order_items    = $this->order->get_items();
		$ga_order_items = array();

		$product_index = 1;
		foreach ( $order_items as $order_item ) {
			if ( ! method_exists( $order_item, 'get_subtotal' ) ||
			! method_exists( $order_item, 'get_subtotal_tax' ) ||
			! method_exists( $order_item, 'get_product_id' ) ||
			! method_exists( $order_item, 'get_name' ) ||
			! method_exists( $order_item, 'get_quantity' ) ||
			! function_exists( 'wc_get_product_category_list' ) ||
			! function_exists( 'wc_get_product_tag_list' ) ||
			! method_exists( $order_item, 'get_variation_id' )
			) {
				break;
			}
			$product_price_with_taxes = $order_item->get_subtotal() + $order_item->get_subtotal_tax();
			$product_price_with_taxes = $this->format_number( $product_price_with_taxes );

			$ga_order_items[ $product_index ]['id']                    = $order_item->get_product_id();
			$ga_order_items[ $product_index ]['name']                  = $order_item->get_name();
			$ga_order_items[ $product_index ]['qty']                   = $order_item->get_quantity();
			$ga_order_items[ $product_index ]['productPriceWithTaxes'] = $product_price_with_taxes;
			$ga_order_items[ $product_index ]['variation_id']          = $order_item->get_variation_id();
			$ga_order_items[ $product_index ]['categories']            = wp_strip_all_tags( wc_get_product_category_list( $order_item->get_product_id() ) );
			$ga_order_items[ $product_index ]['tags']                  = wp_strip_all_tags( wc_get_product_tag_list( $order_item->get_product_id() ) );

			++$product_index;
		}
		return $ga_order_items;
	}

	/**
	 * Format number.
	 *
	 * @param float $number Number.
	 *
	 * @return string
	 */
	private function format_number( $number ) {
		return number_format( round( $number, 2 ), 2, '.', '' );
	}
}
