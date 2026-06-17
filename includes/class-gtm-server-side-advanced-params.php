<?php
/**
 * Advanced Data Layer parameters.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.1.47
 */

defined( 'ABSPATH' ) || exit;

/**
 * Advanced Data Layer parameters.
 */
class GTM_Server_Side_Advanced_Params {
	use GTM_Server_Side_Singleton;

	const ITEM_ID        = 'item_id';
	const ITEM_SKU       = 'item_sku';
	const ITEM_BRAND     = 'item_brand';
	const TRANSACTION_ID = 'transaction_id';

	private const POINT_TYPE_NONE         = 'none';
	private const POINT_TYPE_PRODUCT_ID   = 'product_id';
	private const POINT_TYPE_PARENT_ID    = 'parent_id';
	private const POINT_TYPE_SKU          = 'sku';
	private const POINT_TYPE_GTIN         = 'gtin';
	private const POINT_TYPE_ORDER_NUMBER = 'order_number';
	private const POINT_TYPE_ORDER_ID     = 'order_id';
	private const POINT_TYPE_CUSTOM       = 'custom';

	/**
	 * @var array<string,mixed>|null
	 */
	private $advanced_params = null;

	/**
	 * @var array<string,string>|null
	 */
	private $brand_taxonomies = null;

	/**
	 * @var array<string,mixed>|null
	 */
	private $fields_config = null;

	/**
	 * @var array<string,mixed>|null
	 */
	private $labels = null;

	/**
	 * Sanitize callback.
	 *
	 * @param  mixed $input Raw form input array.
	 * @return string JSON-encoded combined config, or empty string on bad input.
	 */
	public static function sanitize( $input ) {
		if ( ! is_array( $input ) ) {
			return '';
		}
		
		$result = [];
		
		foreach ( self::instance()->get_fields_config() as $key => $field_config ) {
			$result[ $key ] = self::sanitize_field( isset( $input[ $key ] ) ? $input[ $key ] : null, $field_config );
		}

		return wp_json_encode( $result );
	}

	/**
	 * Get one advanced-parameter sub-config by key.
	 *
	 * @param  string $key Sub-key constant (e.g. self::ITEM_ID).
	 * @return array
	 */
	public function get_config_value( $key ) {
		if ( null === $this->advanced_params ) {
			$raw = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_ADV, '' );
			$this->advanced_params = ! empty( $raw ) ? json_decode( $raw, true ) : [];

			if ( ! is_array( $this->advanced_params ) ) {
				$this->advanced_params = [];
			}
		}

		return isset( $this->advanced_params[ $key ] ) ? $this->advanced_params[ $key ] : [];
	}

	/**
	 * Resolve item_id for a product using the advanced settings.
	 *
	 * @param  WC_Product $product Product.
	 * @return string
	 */
	public function resolve_item_id( $product ) {
		$config = $this->get_config_value( self::ITEM_ID );
		if ( empty( $config ) ) {
			return (string) $product->get_id();
		}

		$parts = [];
		foreach ( $config['points'] as $point ) {
			$value = $this->resolve_product_point( $product, $point );
			if ( '' !== $value ) {
				$parts[] = $value;
			}
		}

		$separator = isset( $config['separator'] ) ? $config['separator'] : '';
		$prefix    = isset( $config['prefix'] ) ? $config['prefix'] : '';
		$result    = $prefix . implode( $separator, $parts );

		return '' !== $result ? $result : (string) $product->get_id();
	}

	/**
	 * Resolve item_sku for a product using the advanced settings.
	 *
	 * @param  WC_Product $product Product.
	 * @return string
	 */
	public function resolve_item_sku( $product ) {
		$config = $this->get_config_value( self::ITEM_SKU );
		if ( empty( $config ) ) {
			return (string) $product->get_sku();
		}

		$parts = [];
		foreach ( $config['points'] as $point ) {
			$value = $this->resolve_product_point( $product, $point );
			if ( '' !== $value ) {
				$parts[] = $value;
			}
		}

		$separator = isset( $config['separator'] ) ? $config['separator'] : '';
		$prefix    = isset( $config['prefix'] ) ? $config['prefix'] : '';

		return $prefix . implode( $separator, $parts );
	}

	/**
	 * Resolve item_brand for a product using the advanced settings.
	 *
	 * @param  WC_Product $product Product.
	 * @return string
	 */
	public function resolve_item_brand( $product ) {
		$config = $this->get_config_value( self::ITEM_BRAND );
		$points = isset( $config['points'] ) ? $config['points'] : [];
		$point  = isset( $points[0] ) ? $points[0] : [ 'type' => self::POINT_TYPE_NONE ];
		$type   = isset( $point['type'] ) ? $point['type'] : self::POINT_TYPE_NONE;

		if ( self::POINT_TYPE_NONE === $type ) {
			return '';
		}

		$lookup_id = 'variation' === $product->get_type() ? $product->get_parent_id() : $product->get_id();

		if ( self::POINT_TYPE_CUSTOM === $type ) {
			$meta_key = isset( $point['meta_key'] ) ? $point['meta_key'] : '';
			return '' !== $meta_key ? (string) get_post_meta( $lookup_id, $meta_key, true ) : '';
		}

		return $this->get_brand_from_taxonomy( $lookup_id, $type );
	}

	/**
	 * Resolve transaction_id for an order using the advanced settings.
	 *
	 * @param  WC_Order $order Order.
	 * @return string
	 */
	public function resolve_transaction_id( $order ) {
		$config = $this->get_config_value( self::TRANSACTION_ID );
		$points = isset( $config['points'] ) ? $config['points'] : [];
		$point  = isset( $points[0] ) ? $points[0] : [ 'type' => self::POINT_TYPE_ORDER_NUMBER ];
		$type   = isset( $point['type'] ) ? $point['type'] : self::POINT_TYPE_ORDER_NUMBER;

		if ( self::POINT_TYPE_ORDER_ID === $type ) {
			return (string) $order->get_id();
		}

		if ( self::POINT_TYPE_CUSTOM === $type ) {
			$meta_key = isset( $point['meta_key'] ) ? $point['meta_key'] : '';
			return '' !== $meta_key ? (string) $order->get_meta( $meta_key, true ) : '';
		}

		return $order->get_order_number();
	}

	/**
	 * Resolve one product data point (shared by item_id and item_sku).
	 *
	 * @param  WC_Product $product Product.
	 * @param  array      $point   Data point config.
	 * @return string
	 */
	private function resolve_product_point( $product, array $point ) {
		$type = isset( $point['type'] ) ? $point['type'] : '';

		switch ( $type ) {
			case self::POINT_TYPE_PRODUCT_ID:
				return (string) $product->get_id();

			case self::POINT_TYPE_PARENT_ID:
				return 'variation' === $product->get_type() ? (string) $product->get_parent_id() : '';

			case self::POINT_TYPE_SKU:
				return (string) $product->get_sku();

			case self::POINT_TYPE_GTIN:
				return (string) $product->get_global_unique_id();

			case self::POINT_TYPE_CUSTOM:
				$meta_key = isset( $point['meta_key'] ) ? $point['meta_key'] : '';

				return '' !== $meta_key ? (string) get_post_meta( $product->get_id(), $meta_key, true ) : '';
		}

		return '';
	}

	/**
	 * Render the "Advanced parameters" metabox content.
	 *
	 * @return void
	 */
	public function render_metabox() {
		$fields_config = $this->get_fields_config();
		?>
		<p class="description gtm-adv-note">
			<?php esc_html_e( 'Choose what value goes into each field so it matches the key your ad catalog uses. Defaults match the current behaviour, nothing changes unless you edit a field. These settings apply to both your data layer and webhooks.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?>
		</p>
		<div class="gtm-adv-grid">
		<?php
		foreach ( $fields_config as $key => $field_config ) {
			$config = $this->get_config_value( $key );
			if ( empty( $config ) ) {
				$config = isset( $field_config['default'] ) ? $field_config['default'] : [];
			}
			$this->render_section( $key, $config, $field_config );
		}
		?>
		</div>
		<div class="gtm-adv-reset-row">
			<button type="button" class="button button-secondary gtm-reset-to-defaults">
				<?php esc_html_e( 'Reset to defaults', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?>
			</button>
		</div>
		<?php
	}

	/**
	 * Universally sanitize a single field's raw input based on its config.
	 *
	 * @param  mixed $input        Raw form input.
	 * @param  array $field_config Entry from get_fields_config().
	 * @return array Validated config.
	 */
	private static function sanitize_field( $input, array $field_config ) {
		$allowed_types  = $field_config['data_points'];
		$points_limit   = $field_config['points_limit'];
		$prefix_allowed = $field_config['prefix_allowed'];
		$default        = $field_config['default'];

		if ( ! is_array( $input ) ) {
			return $default;
		}

		$points = [];
		if ( ! empty( $input['points'] ) && is_array( $input['points'] ) ) {
			foreach ( $input['points'] as $point ) {
				if ( ! is_array( $point ) ) {
					continue;
				}
				$type = sanitize_key( isset( $point['type'] ) ? $point['type'] : '' );
				if ( ! in_array( $type, $allowed_types, true ) ) {
					continue;
				}
				$entry = [ 'type' => $type ];
				if ( self::POINT_TYPE_CUSTOM === $type ) {
					$entry['meta_key'] = sanitize_text_field( isset( $point['meta_key'] ) ? $point['meta_key'] : '' );
				}
				$points[] = $entry;
			}
		}

		$points = array_slice( $points, 0, $points_limit );

		if ( empty( $points ) ) {
			$points = $default['points'];
		}

		$result = [ 'points' => $points ];

		if ( $prefix_allowed ) {
			$result['prefix']    = sanitize_text_field( isset( $input['prefix'] ) ? $input['prefix'] : '' );
			$result['separator'] = sanitize_text_field( isset( $input['separator'] ) ? $input['separator'] : '' );
		}

		return $result;
	}

	private function get_brand_taxonomies()
	{
		if ( null !== $this->brand_taxonomies ) {
			return $this->brand_taxonomies;
		}

		$this->brand_taxonomies = [];
		if ( function_exists( 'get_object_taxonomies' ) ) {
			foreach ( get_object_taxonomies( 'product', 'objects' ) as $slug => $tax ) {
				if ( false !== strpos( $slug, 'brand' ) ) {
					$this->brand_taxonomies[ $slug ] = sprintf( '%s (%s)', $tax->label, $slug );
				}
			}
		}

		return $this->brand_taxonomies;
	}

	private function get_fields_config()
	{
		if ($this->fields_config !== null) {
			return $this->fields_config;
		}

		$brand_taxonomies  = $this->get_brand_taxonomies();
		$gtin_available = method_exists( 'WC_Product', 'get_global_unique_id' );
		$id_sku_points  = array_values( array_filter( [
			self::POINT_TYPE_PRODUCT_ID,
			self::POINT_TYPE_PARENT_ID,
			self::POINT_TYPE_SKU,
			$gtin_available ? self::POINT_TYPE_GTIN : null,
			self::POINT_TYPE_CUSTOM,
		] ) );

		$brand_points = array_merge( [ self::POINT_TYPE_NONE ] , array_keys( $brand_taxonomies ), [ self::POINT_TYPE_CUSTOM ] );

		$this->fields_config = [
			self::ITEM_ID        => [
				'prefix_allowed' => true,
				'data_points'    => $id_sku_points,
				'points_limit'   => 3,
				'default'        => ['prefix' => '', 'points' => [['type' => self::POINT_TYPE_PRODUCT_ID]], 'separator' => ''],
			],
			self::ITEM_SKU       => [
				'prefix_allowed' => true,
				'data_points'    => $id_sku_points,
				'points_limit'   => 3,
				'default'        => ['prefix' => '', 'points' => [['type' => self::POINT_TYPE_SKU]], 'separator' => ''],
			],
			self::ITEM_BRAND     => [
				'prefix_allowed' => false,
				'data_points'    => $brand_points,
				'points_limit'   => 1,
				'default'        => ['points' => [['type' => self::POINT_TYPE_NONE]]],
			],
			self::TRANSACTION_ID => [
				'prefix_allowed' => false,
				'data_points'    => [self::POINT_TYPE_ORDER_NUMBER, self::POINT_TYPE_ORDER_ID, self::POINT_TYPE_CUSTOM],
				'points_limit'   => 1,
				'default'        => ['points' => [['type' => self::POINT_TYPE_ORDER_NUMBER]]],
			],
		];

		return $this->fields_config;
	}

	private function get_labels()
	{
		if ( null !== $this->labels ) {
			return $this->labels;
		}

		$this->labels = array_merge(
			[
				self::POINT_TYPE_NONE           => 'None',
				self::POINT_TYPE_PRODUCT_ID     => 'Product ID',
				self::POINT_TYPE_PARENT_ID      => 'Parent ID',
				self::POINT_TYPE_SKU            => 'SKU',
				self::POINT_TYPE_GTIN           => 'GTIN',
				self::POINT_TYPE_ORDER_NUMBER   => 'Order Number',
				self::POINT_TYPE_ORDER_ID       => 'Order ID',
				self::POINT_TYPE_CUSTOM         => 'Custom field',
			],
			$this->get_brand_taxonomies()
		);

		return $this->labels;
	}

	/**
	 * @param string $key
	 * @return string
	 */
	private function get_label( $key ) {
		$labels = $this->get_labels();

		return isset( $labels[ $key ] ) ? $labels[ $key ] : $key;
	}

	/**
	 * Render one advanced-parameter section.
	 *
	 * @param  string $key          Sub-key constant value (e.g. 'item_id').
	 * @param  array  $config       Saved config for this parameter.
	 * @param  array  $field_config Field definition from get_fields_config().
	 * @return void
	 */
	private function render_section( $key, array $config, array $field_config ) {
		$input_prefix   = GTM_SERVER_SIDE_FIELD_ADV . '[' . $key . ']';
		$prefix_allowed = $field_config['prefix_allowed'];
		$data_points    = $field_config['data_points'];
		$points_limit   = $field_config['points_limit'];
		$is_multi       = $points_limit > 1;

		$first_point = (string) reset( $data_points );
		$points      = isset( $config['points'] ) ? $config['points'] : [ [ 'type' => $first_point ] ];
		$has_multi   = count( $points ) > 1;
		$default_type = isset( $field_config['default']['points'][0]['type'] ) ? $field_config['default']['points'][0]['type'] : '';
		?>
		<h3><code><?php echo esc_html( $key ); ?></code></h3>
		<div class="gtm-adv-section"
			data-option="<?php echo esc_attr( $key ); ?>"
			data-points-limit="<?php echo (int) $points_limit; ?>"
			data-default-point="<?php echo esc_attr( $default_type ); ?>">
			<div class="gtm-addv-field-rows">
				<?php if ( $prefix_allowed ) : ?>
				<div class="gtm-adv-field-row">
					<label><?php esc_html_e( 'Prefix', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?></label>
					<input type="text"
						name="<?php echo esc_attr( $input_prefix ); ?>[prefix]"
						value="<?php echo esc_attr( isset( $config['prefix'] ) ? $config['prefix'] : '' ); ?>"
						class="gtm-prefix-input">
				</div>
				<?php endif; ?>
				<div class="gtm-adv-field-row">
					<label><?php esc_html_e( $is_multi ? 'Data points' : 'Source', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?></label>
					<div class="gtm-data-points-container">
						<?php foreach ( $points as $index => $point ) :
							$type         = isset( $point['type'] ) ? $point['type'] : $first_point;
							$meta_key_val = isset( $point['meta_key'] ) ? $point['meta_key'] : '';
						?>
							<div class="gtm-data-point-row">
								<select name="<?php echo esc_attr( $input_prefix ); ?>[points][<?php echo (int) $index; ?>][type]"
									class="gtm-point-type-select">
									<?php foreach ( $data_points as $val ) : ?>
										<option value="<?php echo esc_attr( $val ); ?>" <?php selected( $type, $val ); ?>>
											<?php echo esc_html( $this->get_label( $val ) ); ?>
										</option>
									<?php endforeach; ?>
								</select>
								<input type="text"
									name="<?php echo esc_attr( $input_prefix ); ?>[points][<?php echo (int) $index; ?>][meta_key]"
									value="<?php echo esc_attr( $meta_key_val ); ?>"
									placeholder="<?php esc_attr_e( 'Custom field key', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?>"
									class="gtm-meta-key<?php echo self::POINT_TYPE_CUSTOM === $type ? ' is-visible' : ''; ?>">
								<?php if ( $is_multi ) : ?>
									<button type="button" class="gtm-remove-point button-link<?php echo ! $has_multi ? ' is-hidden' : ''; ?>" aria-label="<?php esc_attr_e( 'Remove', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?>">&times;</button>
								<?php endif; ?>
							</div>
						<?php endforeach; ?>
						<?php if ( $is_multi ) : ?>
							<button type="button" class="gtm-add-data-point button button-secondary"<?php echo count( $points ) >= $points_limit ? ' disabled' : ''; ?>><?php esc_html_e( '+ Add', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?></button>
						<?php endif; ?>
					</div>
				</div>
				<?php if ( $is_multi ) : ?>
				<div class="gtm-adv-field-row gtm-separator-row<?php echo $has_multi ? '' : ' is-hidden'; ?>">
					<label><?php esc_html_e( 'Separator', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?></label>
					<input type="text"
						name="<?php echo esc_attr( $input_prefix ); ?>[separator]"
						value="<?php echo esc_attr( isset( $config['separator'] ) ? $config['separator'] : '' ); ?>"
						class="gtm-separator-input"
						size="5">
				</div>
				<div class="gtm-adv-field-row">
					<label><?php esc_html_e( 'Result', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ); ?></label>
					<code class="gtm-result-preview"></code>
				</div>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}	

	/**
	 * Look up the first term name for a product in a given taxonomy.
	 *
	 * @param  int    $product_id Product id.
	 * @param  string $taxonomy   Taxonomy slug.
	 * @return string
	 */
	private function get_brand_from_taxonomy( $product_id, $taxonomy ) {
		$terms = wp_get_post_terms(
			$product_id,
			$taxonomy,
			[
				'orderby' => 'parent',
				'order'   => 'ASC',
			]
		);

		if ( empty( $terms ) || ! is_a( $terms[0], 'WP_Term' ) ) {
			return '';
		}

		return $terms[0]->name;
	}
}
