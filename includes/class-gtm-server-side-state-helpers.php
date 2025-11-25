<?php
/**
 * State helpers class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * State helpers class.
 */
class GTM_Server_Side_State_Helpers {
	use GTM_Server_Side_Singleton;

	const CART_TOKEN_COOKIE = '_stape_cart_state_token';

	/**
	 * Return data for state cart.
	 *
	 * @param  WC_Cart $cart Cart.
	 * @return array
	 */
	public function get_cart_data( $cart ) {
		if ( ! ( $cart instanceof WC_Cart ) ) {
			return array();
		}

		$result = array(
			'cart_id'       => self::get_cart_token(),
			'cart_quantity' => $cart->get_cart_contents_count(),
			'cart_value'    => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $cart->get_subtotal() ),
			'currency'      => esc_attr( get_woocommerce_currency() ),
			'lines'         => $this->get_cart_items( $cart ),
		);

		return $result;
	}

	/**
	 * Return items for state cart.
	 *
	 * @param  WC_Cart $cart Cart.
	 * @return array
	 */
	private function get_cart_items( $cart ) {
		if ( ! ( $cart instanceof WC_Cart ) ) {
			return array();
		}

		$result = array();
		$cart   = WC()->cart->get_cart();
		foreach ( $cart as $product_loop ) {
			$product = $product_loop['data'];

			if ( ! ( $product instanceof WC_Product ) ) {
				continue;
			}

			$product_data = array(
				'item_variant'     => isset( $product_loop['variation_id'] ) && $product_loop['variation_id'] ? esc_attr( $product_loop['variation_id'] ) : '',
				'item_id'          => esc_attr( $product->get_id() ),
				'item_sku'         => esc_attr( $product->get_sku() ),
				'item_name'        => esc_attr( $product->get_name() ),
				'quantity'         => (int) $product_loop['quantity'],
				'line_total_price' => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $product_loop['line_total'] ),
				'price'            => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $product->get_price() ),
			);

			$result[] = $product_data;
		}

		return $result;
	}

	/**
	 * Return data for state cart.
	 *
	 * @param  WC_Order $order Order.
	 * @return array
	 */
	public function get_order_data( $order ) {
		if ( ! ( $order instanceof WC_Order ) ) {
			return array();
		}

		$result = array(
			'cart_id'       => $order->get_meta( self::CART_TOKEN_COOKIE, true ),
			'cart_quantity' => $order->get_item_count(),
			'cart_value'    => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $order->get_subtotal() ),
			'currency'      => esc_attr( $order->get_currency() ),
			'lines'         => $this->get_order_items( $order ),
		);

		return $result;
	}

	/**
	 * Return order items.
	 *
	 * @param WC_Order $order Order.
	 * @return array
	 */
	private function get_order_items( $order ) {
		if ( ! ( $order instanceof WC_Order ) ) {
			return array();
		}

		$result = array();
		foreach ( $order->get_items() as $item ) {
			if ( ! ( $item instanceof WC_Order_Item_Product ) ) {
				continue;
			}

			$product = $item->get_product();
			if ( ! ( $product instanceof WC_Product ) ) {
				continue;
			}

			$variation_id = $product->get_type() === 'variation' ? $product->get_id() : '';

			$product_data = array(
				'item_variant'     => $variation_id ? esc_attr( $variation_id ) : '',
				'item_id'          => esc_attr( $product->get_id() ),
				'item_sku'         => esc_attr( $product->get_sku() ),
				'item_name'        => esc_attr( $product->get_name() ),
				'quantity'         => (int) $item->get_quantity(),
				'line_total_price' => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $item->get_total() ),
				'price'            => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $product->get_price() ),
			);

			$result[] = $product_data;
		}

		return $result;
	}

	/**
	 * Return cart token.
	 *
	 * @return string|bool
	 */
	public static function get_cart_token() {
		if ( ! function_exists( 'WC' ) ) {
			return false;
		}

		if ( empty( WC()->session->get( self::CART_TOKEN_COOKIE ) ) ) {
			$token = wp_generate_uuid4();
			WC()->session->set( self::CART_TOKEN_COOKIE, $token );
		}

		return WC()->session->get( self::CART_TOKEN_COOKIE );
	}
}
