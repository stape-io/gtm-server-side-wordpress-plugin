<?php
/**
 * WooCommerce helpers class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce helpers class.
 */
class GTM_Server_Side_WC_Helpers {
	use GTM_Server_Side_Singleton;

	/**
	 * Return product categories
	 *
	 * @param  int $category_id Category id.
	 * @return string
	 */
	public function get_product_categories( $category_id ) {
		$crumbs = get_term_parents_list(
			$category_id,
			'product_cat',
			array(
				'link' => false,
			)
		);

		/* phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		$term = get_term_by( 'term_id', $category_id, 'product_cat' );
		if ( ! is_a( $term, 'WP_Term' ) ) {
			return '';
		}
		*/

		return rtrim( $crumbs, '/' );
	}

	/**
	 * Return formatted product to data layer.
	 *
	 * @param  WC_Product $product WC Product.
	 * @param  array      $args Parameters.
	 * @return array
	 */
	public function get_data_layer_item( $product, array $args = array() ) {
		$args = wp_parse_args(
			$args,
			array(
				'add_categories' => true,
				'add_variations' => true,
			)
		);

		$result = array(
			'item_name'  => esc_attr( $product->get_name() ),
			'item_brand' => esc_attr( $this->get_product_brand( $product->get_id() ) ),
			'item_id'    => esc_attr( $product->get_id() ),
			'item_sku'   => esc_attr( $product->get_sku() ),
			'price'      => $this->formatted_price( $product->get_price() ),
			'imageUrl'   => $this->get_product_image_url( $product ),
		);

		if ( true === $args['add_variations'] ) {
			if ( 'variation' === $product->get_type() ) {
				$result['item_variant'] = implode( ',', $this->get_product_variations( $product ) );
			}
		}

		if ( true === $args['add_categories'] ) {
			$category_ids = $product->get_category_ids();
			if ( $product->get_parent_id() > 0 ) {
				$parent_product = wc_get_product( $product->get_parent_id() );
				if ( ! empty( $parent_product ) ) {
					$category_ids = $parent_product->get_category_ids();
				}
			}
			$result = $result + $this->get_data_layer_categories( $category_ids );
		}

		return $result;
	}

	/**
	 * Return data layer items from order.
	 *
	 * @param  array $items Products.
	 * @return array
	 */
	public function get_order_data_layer_items( $items ) {
		$index  = 1;
		$result = array();
		foreach ( $items as $item_loop ) {
			$product = $item_loop->get_product();

			if ( ! ( $product instanceof WC_Product ) ) {
				continue;
			}

			$array = $this->get_data_layer_item( $product );

			$subtotal = $item_loop->get_subtotal();
			$total    = $item_loop->get_total();
			$discount = $subtotal - $total;

			if ( $discount > 0 ) {
				$price          = floatval( $product->get_price() ) - $discount;
				$array['price'] = $this->formatted_price( $price );
			}

			$array['discount'] = $this->formatted_price( $discount );
			$array['quantity'] = intval( $item_loop->get_quantity() );
			$array['index']    = $index++;

			$result[] = $array;
		}

		return $result;
	}

	/**
	 * Return formatted product items from cart to data layer.
	 *
	 * @param  array $cart Cart products.
	 * @return array
	 */
	public function get_cart_data_layer_items( $cart ) {
		$index  = 1;
		$result = array();
		foreach ( $cart as $product_loop ) {
			$product = $product_loop['data'];

			if ( ! ( $product instanceof WC_Product ) ) {
				continue;
			}

			$array             = $this->get_data_layer_item( $product );
			$array['quantity'] = intval( $product_loop['quantity'] );
			$array['index']    = $index++;

			$result[] = $array;
		}

		return $result;
	}

	/**
	 * Return formatted product items by category id to data layer.
	 *
	 * @param  int $category_id Category id.
	 * @return array
	 */
	public function get_category_data_layer_items( $category_id ) {
		$index  = 1;
		$result = array();

		$category = get_term_by( 'id', $category_id, 'product_cat' );
		if ( ! $category instanceof WP_Term ) {
			return array();
		}

		$products = wc_get_products(
			array(
				'product_category_id' => $category_id,
				'limit'               => 10,
				'orderby'             => 'title',
				'order'               => 'ASC',
			)
		);

		foreach ( $products as $product ) {

			$array                   = $this->get_data_layer_item( $product );
			$array['item_list_id']   = $category->term_id;
			$array['item_list_name'] = $category->name;
			$array['quantity']       = 1;
			$array['index']          = $index++;

			$result[] = $array;
		}

		return $result;
	}

	/**
	 * Return formatted user data to data layer.
	 *
	 * @return array
	 */
	public function get_data_layer_user_data() {
		if ( ! ( WC()->customer instanceof WC_Customer ) ) {
			return array();
		}
		$customer = new WC_Customer( WC()->customer->get_id() );

		$fields = array(
			'customer_id'         => $customer->get_id(),
			'email'               => $customer->get_email(),
			'first_name'          => $customer->get_first_name(),
			'last_name'           => $customer->get_last_name(),
			'billing_first_name'  => $customer->get_billing_first_name(),
			'billing_last_name'   => $customer->get_billing_last_name(),
			'billing_company'     => $customer->get_billing_company(),
			'billing_address'     => join( ' ', array( $customer->get_billing_address_1(), $customer->get_billing_address_2() ) ),
			'billing_postcode'    => $customer->get_billing_postcode(),
			'billing_country'     => $customer->get_billing_country(),
			'billing_state'       => $customer->get_billing_state(),
			'billing_city'        => $customer->get_billing_city(),
			'billing_email'       => $customer->get_billing_email(),
			'billing_phone'       => $customer->get_billing_phone(),
			'shipping_first_name' => $customer->get_shipping_first_name(),
			'shipping_last_name'  => $customer->get_shipping_last_name(),
			'shipping_company'    => $customer->get_shipping_company(),
			'shipping_address'    => join( ' ', array( $customer->get_shipping_address_1(), $customer->get_shipping_address_2() ) ),
			'shipping_postcode'   => $customer->get_shipping_postcode(),
			'shipping_country'    => $customer->get_shipping_country(),
			'shipping_state'      => $customer->get_shipping_state(),
			'shipping_city'       => $customer->get_shipping_city(),
		);

		if ( method_exists( $customer, 'get_shipping_phone' ) ) {
			$fields['shipping_phone'] = $customer->get_shipping_phone();
		}

		$fields = array_map( 'trim', $fields );
		$fields = array_filter( $fields );

		return $fields;
	}

	/**
	 * Return order user data.
	 *
	 * @param  WC_Order $order Order.
	 * @return array
	 */
	public function get_order_user_data( $order ) {
		if ( ! ( $order instanceof WC_Order ) ) {
			return array();
		}

		$data = array(
			'customer_id'         => $order->get_customer_id(),
			'billing_first_name'  => $order->get_billing_first_name(),
			'billing_last_name'   => $order->get_billing_last_name(),
			'billing_address'     => join( ' ', array( $order->get_billing_address_1(), $order->get_billing_address_2() ) ),
			'billing_postcode'    => $order->get_billing_postcode(),
			'billing_country'     => $order->get_billing_country(),
			'billing_state'       => $order->get_billing_state(),
			'billing_city'        => $order->get_billing_city(),
			'billing_email'       => $order->get_billing_email(),
			'billing_phone'       => $order->get_billing_phone(),
			'shipping_first_name' => $order->get_shipping_first_name(),
			'shipping_last_name'  => $order->get_shipping_last_name(),
			'shipping_company'    => $order->get_shipping_company(),
			'shipping_address'    => join( ' ', array( $order->get_shipping_address_1(), $order->get_shipping_address_2() ) ),
			'shipping_postcode'   => $order->get_shipping_postcode(),
			'shipping_country'    => $order->get_shipping_country(),
			'shipping_state'      => $order->get_shipping_state(),
			'shipping_city'       => $order->get_shipping_city(),
		);

		if ( method_exists( $order, 'get_shipping_phone' ) ) {
			$data['shipping_phone'] = $order->get_shipping_phone();
		}

		$user = $order->get_user();
		if ( $user instanceof WP_User ) {
			$data['email']      = $user->user_email;
			$data['first_name'] = $user->first_name;
			$data['last_name']  = $user->last_name;
		}

		$data = array_map( 'trim', $data );
		$data = array_filter( $data );

		return $data;
	}

	/**
	 * Check is new customer.
	 *
	 * @param  int $customer_id ID customer.
	 * @return mixed
	 */
	public function is_new_customer( $customer_id ) {
		if ( ! function_exists( 'WC' ) ) {
			return null;
		}

		$customer = new WC_Customer( $customer_id );
		if ( ! ( $customer instanceof WC_Customer ) ) {
			return null;
		}

		return $customer->get_order_count() === 1;
	}

	/**
	 * Return data layer categories
	 *
	 * @param  array $category_ids Categories ids.
	 * @return array
	 */
	public function get_data_layer_categories( $category_ids ) {
		$result = array();
		if ( empty( $category_ids[0] ) ) {
			return $result;
		}

		$breadcrumbs = $this->get_product_categories( $category_ids[0] );
		if ( empty( $breadcrumbs ) ) {
			return $result;
		}

		$categories     = explode( '/', $breadcrumbs );
		$category_index = 1;
		foreach ( $categories as $category_name ) {
			$index            = $category_index > 1 ? 'item_category' . $category_index : 'item_category';
			$result[ $index ] = esc_attr( $category_name );

			if ( $category_index >= 5 ) {
				return $result;
			}
			$category_index++;
		}
		return $result;
	}

	/**
	 * Return product brand
	 *
	 * @param  int $product_id Product id.
	 * @return string
	 */
	public function get_product_brand( $product_id ) {
		$taxonomy = apply_filters( 'gtm_server_side_product_brand_taxonomy', false );
		if ( false === $taxonomy ) {
			return '';
		}

		$terms = wp_get_post_terms(
			$product_id,
			$taxonomy,
			array(
				'orderby' => 'parent',
				'order'   => 'ASC',
			)
		);

		if ( empty( $terms ) ) {
			return '';
		}
		if ( empty( $terms[0] ) ) {
			return '';
		}
		if ( ! is_a( $terms[0], 'WP_Term' ) ) {
			return '';
		}

		return $terms[0]->name;
	}

	/**
	 * Return product variations.
	 *
	 * @param  WC_Product_Variation $product Product.
	 * @return array
	 */
	public function get_product_variations( $product ) {
		$labels     = array();
		$attributes = $product->get_variation_attributes();
		foreach ( $attributes as $key => $value ) {
			if ( false === strstr( $key, 'attribute_pa_' ) ) {
				$labels[] = $value;
				continue;
			}

			$taxonomy = str_replace( 'attribute_', '', $key );
			if ( ! taxonomy_exists( $taxonomy ) ) {
				continue;
			}

			$term = get_term_by( 'slug', $value, $taxonomy );
			if ( is_a( $term, 'WP_Term' ) ) {
				$labels[] = $term->name;
			}
		}
		return $labels;
	}

	/**
	 * Check enable or disable ecommerce.
	 *
	 * @return bool
	 */
	public function is_enable_ecommerce() {
		return function_exists( 'WC' ) && GTM_Server_Side_Helpers::is_enable_data_layer_ecommerce();
	}

	/**
	 * Check enable or disable user data.
	 *
	 * @return bool
	 */
	public function is_enable_user_data() {
		return function_exists( 'WC' ) && ( WC()->customer instanceof WC_Customer ) && GTM_Server_Side_Helpers::is_enable_data_layer_user_data();
	}

	/**
	 * Return formatted price
	 *
	 * @param  mixed $price Price.
	 * @return float
	 */
	public function formatted_price( $price ) {
		$price = floatval( $price );
		if ( function_exists( 'wc_format_decimal' ) ) {
			$price = wc_format_decimal( $price, wc_get_price_decimals() );
		} else {
			$price = number_format( $price, 2, '.', '' );
		}
		// $price = round( $price, 2, PHP_ROUND_HALF_UP ); phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		return $price;
	}

	/**
	 * Gets the cart contents total (after calculation).
	 *
	 * @return string formatted price
	 */
	public function get_cart_total() {
		return wc_prices_include_tax() ? WC()->cart->get_cart_contents_total() + WC()->cart->get_cart_contents_tax() : WC()->cart->get_cart_contents_total();
	}

	/**
	 * Return country.
	 *
	 * @param  string $code Code.
	 * @return string
	 */
	private function get_country( $code ) {
		return WC()->countries->countries[ $code ] ?? '';
	}

	/**
	 * Return state.
	 *
	 * @param  string $country_code Country code.
	 * @param  string $state_code State code.
	 * @return string
	 */
	private function get_state( $country_code, $state_code ) {
		$states = WC()->countries->get_states( $country_code );
		if ( empty( $states ) ) {
			return '';
		}

		return $states[ $state_code ] ?? '';
	}

	/**
	 * Return product image url.
	 *
	 * @param  WC_Product $product Product.
	 * @return string
	 */
	private function get_product_image_url( $product ) {
		$image_id = $product->get_image_id();
		if ( empty( $image_id ) ) {
			return '';
		}

		$image_url = wp_get_attachment_url( $image_id );
		if ( empty( $image_url ) ) {
			return '';
		}

		return $image_url;
	}
}
