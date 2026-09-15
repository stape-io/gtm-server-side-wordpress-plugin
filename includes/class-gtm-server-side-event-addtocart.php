<?php
/**
 * Data Layer Event: add_to_cart.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: add_to_cart.
 */
class GTM_Server_Side_Event_AddToCart {
	use GTM_Server_Side_Singleton;

	/**
	 * Prefix for data attrs.
	 */
	const DATA_ATTR_PREFIX = 'data-gtm_';

	/**
	 * Session key holding the items added by a non-AJAX request.
	 *
	 * @var string
	 */
	const SESSION_ITEMS_KEY = '_gtm_server_side_add_to_cart';

	/**
	 * How long a stashed item stays eligible for its render, in seconds.
	 *
	 * The render that follows the add may never reach wp_footer (a cached
	 * page, a closed tab, a non-HTML response). A WooCommerce session lives
	 * for days, so an item that missed its render expires instead of firing on
	 * an unrelated page view.
	 *
	 * @var int
	 */
	const SESSION_ITEMS_MAX_AGE = 300;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! GTM_Server_Side_WC_Helpers::instance()->is_enable_ecommerce() ) {
			return;
		}

		add_action( 'woocommerce_add_to_cart', array( $this, 'woocommerce_add_to_cart' ), 10, 4 );
		add_action( 'wp_footer', array( $this, 'wp_footer' ) );

		add_filter( 'woocommerce_cart_item_remove_link', array( $this, 'woocommerce_cart_item_remove_link' ), 10, 2 );
		add_filter( 'woocommerce_loop_add_to_cart_args', array( $this, 'woocommerce_loop_add_to_cart_args' ), 10, 2 );
		add_filter( 'woocommerce_blocks_product_grid_item_html', array( $this, 'woocommerce_blocks_product_grid_item_html' ), 10, 3 );
		add_action( 'woocommerce_after_add_to_cart_button', array( $this, 'woocommerce_after_add_to_cart_button' ) );
		add_filter( 'woocommerce_grouped_product_list_column_quantity', array( $this, 'woocommerce_grouped_product_list_column_quantity' ), 10, 2 );

		add_filter( 'gtm_server_side_before_html_data_attributes', array( $this, 'format_data_attributes' ) );
		add_filter( 'gtm_server_side_after_html_data_attributes', array( $this, 'attach_data_to_event_select_item' ), 20, 3 );
	}

	/**
	 * Hook: woocommerce_add_to_cart.
	 *
	 * The click-time push in assets/js/javascript.js is lost whenever the add
	 * ends in a page load, so the item is stashed here and pushed on the next
	 * render instead. An AJAX add keeps its click-time push: it has no page
	 * render afterwards, so a stashed event might never fire.
	 *
	 * @param  string $cart_item_key Cart item key.
	 * @param  int    $product_id Product id.
	 * @param  int    $quantity Quantity.
	 * @param  int    $variation_id Variation id.
	 * @return void
	 */
	public function woocommerce_add_to_cart( $cart_item_key, $product_id, $quantity, $variation_id ) {
		if ( ! $this->is_page_load_request() ) {
			return;
		}

		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return;
		}

		$items = WC()->session->get( self::SESSION_ITEMS_KEY );
		if ( ! is_array( $items ) ) {
			$items = array();
		}

		$items[] = array(
			'product_id'   => (int) $product_id,
			'variation_id' => (int) $variation_id,
			'quantity'     => max( 1, (int) $quantity ),
			'time'         => time(),
		);

		WC()->session->set( self::SESSION_ITEMS_KEY, $items );
	}

	/**
	 * WP footer hook.
	 *
	 * @return void
	 */
	public function wp_footer() {
		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return;
		}

		$items = WC()->session->get( self::SESSION_ITEMS_KEY );
		if ( empty( $items ) || ! is_array( $items ) ) {
			return;
		}

		WC()->session->__unset( self::SESSION_ITEMS_KEY );

		$items = $this->drop_expired_items( $items );
		if ( empty( $items ) ) {
			return;
		}

		$data_layer_items = $this->get_stashed_data_layer_items( $items );
		if ( empty( $data_layer_items ) ) {
			return;
		}

		$value = 0;
		foreach ( $data_layer_items as $item ) {
			$value += floatval( $item['price'] ) * $item['quantity'];
		}

		$data_layer = array(
			'event'          => GTM_Server_Side_Helpers::get_data_layer_event_name( 'add_to_cart' ),
			'ecomm_pagetype' => 'product',
			'ecommerce'      => array(
				'currency' => esc_attr( get_woocommerce_currency() ),
				'value'    => GTM_Server_Side_WC_Helpers::instance()->formatted_price( $value ),
				'items'    => $data_layer_items,
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

	/**
	 * Whether the current request is one that ends in a page render.
	 *
	 * An AJAX or Store API add keeps the click-time JavaScript push, so only a
	 * plain front-end request produces the server-side event.
	 *
	 * @return bool
	 */
	private function is_page_load_request() {
		if ( wp_doing_ajax() || wp_doing_cron() ) {
			return false;
		}

		if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
			return false;
		}

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			return false;
		}

		return true;
	}

	/**
	 * Drop stashed items whose render never happened.
	 *
	 * @param  array $items Stashed items.
	 * @return array
	 */
	private function drop_expired_items( $items ) {
		$now    = time();
		$result = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || empty( $item['time'] ) ) {
				continue;
			}

			if ( ( $now - (int) $item['time'] ) > self::SESSION_ITEMS_MAX_AGE ) {
				continue;
			}

			$result[] = $item;
		}

		return $result;
	}

	/**
	 * Return data layer items for the stashed products.
	 *
	 * @param  array $items Stashed items.
	 * @return array
	 */
	private function get_stashed_data_layer_items( $items ) {
		$index  = 1;
		$result = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) || empty( $item['product_id'] ) ) {
				continue;
			}

			$product_id = empty( $item['variation_id'] ) ? (int) $item['product_id'] : (int) $item['variation_id'];
			$product    = wc_get_product( $product_id );

			if ( ! ( $product instanceof WC_Product ) ) {
				continue;
			}

			$array             = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_item( $product );
			$array['quantity'] = isset( $item['quantity'] ) ? intval( $item['quantity'] ) : 1;
			$array['index']    = $index++;

			$result[] = $array;
		}

		return $result;
	}

	/**
	 * Hook: woocommerce_cart_item_remove_link.
	 *
	 * @param  string $link Html link.
	 * @param  string $cart_item_key Item key.
	 * @return string
	 */
	public function woocommerce_cart_item_remove_link( $link, $cart_item_key ) {
		$item = WC()->cart->get_cart_item( $cart_item_key );
		if ( empty( $item ) ) {
			return $link;
		}

		$data             = $this->get_item( $item['data'] );
		$data             = apply_filters( 'gtm_server_side_before_html_data_attributes', $data, 'remove_from_cart', 'woocommerce_cart_item_remove_link' );
		$data['quantity'] = isset( $item['quantity'] ) ? intval( $item['quantity'] ) : 1;
		$data             = $this->convert_product_data_to_html_attrs( $data );
		$attrs            = apply_filters( 'gtm_server_side_after_html_data_attributes', $data, 'remove_from_cart', 'woocommerce_cart_item_remove_link' );
		$link             = str_replace( '<a ', '<a ' . join( ' ', $attrs ), $link );

		return $link;
	}

	/**
	 * Hook: woocommerce_loop_add_to_cart_args.
	 *
	 * @param  array      $args Args.
	 * @param  WC_Product $product Product.
	 * @return array
	 */
	public function woocommerce_loop_add_to_cart_args( $args, $product ) {
		global $woocommerce_loop;

		if ( ! ( $product instanceof WC_Product ) ) {
			return $args;
		}
		if ( 'simple' !== $product->get_type() ) {
			return $args;
		}

		$data             = $this->get_item( $product );
		$data             = apply_filters( 'gtm_server_side_before_html_data_attributes', $data, 'add_to_cart', 'woocommerce_loop_add_to_cart_args' );
		$data['quantity'] = isset( $args['quantity'] ) ? intval( $args['quantity'] ) : 1;
		$data['index']    = isset( $woocommerce_loop['loop'] ) ? intval( $woocommerce_loop['loop'] ) : 1;
		$data             = $this->convert_product_data_key( $data );
		$attrs            = apply_filters( 'gtm_server_side_after_html_data_attributes', $data, 'add_to_cart', 'woocommerce_loop_add_to_cart_args' );

		if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
			$args['attributes'] = array();
		}

		$args['attributes'] = $args['attributes'] + $attrs;

		return $args;
	}

	/**
	 * Hook: woocommerce_blocks_product_grid_item_html.
	 *
	 * @param  string     $html HTML code.
	 * @param  array      $data Data.
	 * @param  WC_Product $product Product data.
	 * @return string
	 */
	public function woocommerce_blocks_product_grid_item_html( $html, $data, $product ) {
		if ( ! ( $product instanceof WC_Product ) ) {
			return $html;
		}
		if ( 'simple' !== $product->get_type() ) {
			return $html;
		}

		$data  = $this->get_item( $product );
		$data  = apply_filters( 'gtm_server_side_before_html_data_attributes', $data, 'add_to_cart', 'woocommerce_blocks_product_grid_item_html' );
		$data  = $this->convert_product_data_to_html_attrs( $data );
		$attrs = apply_filters( 'gtm_server_side_after_html_data_attributes', $data, 'add_to_cart', 'woocommerce_blocks_product_grid_item_html' );
		$html  = str_replace( '<li ', '<li ' . join( ' ', $attrs ), $html );

		return $html;
	}

	/**
	 * Hook: woocommerce_after_add_to_cart_button.
	 *
	 * @return void
	 */
	public function woocommerce_after_add_to_cart_button() {
		global $product;

		if ( ! $product ) {
			return;
		}
		if ( ! ( $product instanceof WC_Product ) ) {
			return;
		}
		if ( 'grouped' === $product->get_type() ) {
			return;
		}
		$data = $this->get_item( $product );
		foreach ( $data as $key => $value ) {
			echo '<input type="hidden" name="gtm_' . esc_attr( $key ) . '" value="' . esc_attr( $value ) . '">' . "\n";
		}
	}

	/**
	 * Hook: woocommerce_grouped_product_list_column_quantity.
	 *
	 * @param  string     $html HTML.
	 * @param  WC_Product $product Product.
	 * @return void
	 */
	public function woocommerce_grouped_product_list_column_quantity( $html, $product ) {
		if ( ! ( $product instanceof WC_Product ) ) {
			return;
		}

		$data = $this->get_item( $product );
		foreach ( $data as $key => $value ) {
			$html .= '<input type="hidden" name="gtm_' . esc_attr( $key ) . '[' . esc_attr( $product->get_id() ) . ']" value="' . esc_attr( $value ) . '" data-name="' . esc_attr( $key ) . '">' . "\n";
		}

		return $html;
	}

	/**
	 * Formatted data attributes.
	 *
	 * @param  array $data Attrs.
	 * @return array
	 */
	public function format_data_attributes( $data ) {
		if ( isset( $data['imageUrl'] ) ) {
			$data['image-url'] = $data['imageUrl'];
			unset( $data['imageUrl'] );
		}

		return $data;
	}

	/**
	 * Attach data to event select item.
	 *
	 * @param  array  $data Attrs.
	 * @param  string $type Type.
	 * @param  string $caller_hook Caller hook.
	 * @return array
	 */
	public function attach_data_to_event_select_item( $data, $type, $caller_hook ) {
		if ( 'add_to_cart' !== $type ) {
			return $data;
		}

		$first_key = false;
		if ( is_array( $data ) ) {
			$first_key = array_key_first( $data );
		}

		if ( false === $first_key ) {
			return $data;
		}

		$pagetype       = null;
		$collection_id  = null;
		$item_list_name = null;

		if ( is_search() ) {
			$pagetype = 'search';
		} elseif ( is_shop() ) {
			$pagetype = 'shop';
		} elseif ( is_product_category() ) {
			$pagetype = 'category';
		} elseif ( is_product_tag() ) {
			$pagetype = 'tag';
		} elseif ( 'woocommerce_blocks_product_grid_item_html' === $caller_hook ) {
			$pagetype = 'grid';
		}

		if ( is_product_category() || is_product_tag() ) {
			$term = get_queried_object();
			if ( $term instanceof WP_Term ) {
				$collection_id  = $term->term_id;
				$item_list_name = $term->name;
			}
		}

		if ( is_int( $first_key ) ) {
			$data[] = 'data-custom_gtm_pagetype="' . esc_attr( $pagetype ) . '"';
			$data[] = 'data-custom_gtm_collection_id="' . esc_attr( $collection_id ) . '"';
			$data[] = 'data-custom_gtm_item_list_name="' . esc_attr( $item_list_name ) . '"';
		} else {
			$data['data-custom_gtm_pagetype']       = esc_attr( $pagetype );
			$data['data-custom_gtm_collection_id']  = esc_attr( $collection_id );
			$data['data-custom_gtm_item_list_name'] = esc_attr( $item_list_name );
		}

		return $data;
	}

	/**
	 * Convert product data key.
	 *
	 * @param  array $data Data.
	 * @return array
	 */
	private function convert_product_data_key( $data ) {
		$array = array();
		foreach ( $data as $key => $value ) {
			$array[ self::DATA_ATTR_PREFIX . $key ] = $value;
		}
		return $array;
	}

	/**
	 * Convert array to attributes.
	 *
	 * @param  array $data Data.
	 * @return array
	 */
	private function convert_product_data_to_html_attrs( $data ) {
		$array = array();
		foreach ( $data as $key => $value ) {
			$array[] = esc_attr( self::DATA_ATTR_PREFIX . $key ) . '="' . esc_attr( $value ) . '"';
		}
		return $array;
	}

	/**
	 * Return product data
	 *
	 * @param  WC_Product $product Product.
	 * @return array
	 */
	private function get_item( $product ) {
		if ( ! ( $product instanceof WC_Product ) ) {
			return array();
		}

		$array          = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_item( $product );
		$array['index'] = 1;

		return $array;
	}
}
