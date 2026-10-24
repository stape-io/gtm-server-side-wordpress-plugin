<?php
/**
 * Plugin Name:       GTM Server Side e2e flat rate shipping
 * Description:       Test-only. Offers a flat rate shipping method to the requests of one e2e test, at the cost its cookie names. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * The baseline store has no shipping method, and a real one can't be added
 * for a single test: once any shipping method is enabled, every cart in the
 * store needs a shipping option, and the checkouts of the tests running next
 * to it fail with "this order requires a shipping option". So this adds a flat
 * rate to "Locations not covered by your other zones" for the browser that
 * carries the cookie only, and the database never holds it.
 *
 * @package GTM_Server_Side_E2E_Flat_Rate_Shipping
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the testPlugins.flatRateShipping() fixture sets: the cost, `5.00`. */
const GTM_SERVER_SIDE_E2E_FLAT_RATE_COOKIE = 'gtm_e2e_flat_rate';

/** An instance ID no real shipping method has: it exists only in this plugin. */
const GTM_SERVER_SIDE_E2E_FLAT_RATE_INSTANCE = 990001;

/** The cost from the cookie, or '' when the request carries none. */
function gtm_server_side_e2e_flat_rate_cost(): string {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, matched against a strict pattern below.
	$cost = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_FLAT_RATE_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_FLAT_RATE_COOKIE ] : '';

	return preg_match( '/^\d{1,4}\.\d{2}$/', $cost ) ? $cost : '';
}

// Off anywhere but a local install, so a visitor's cookie can't add shipping
// to a shared site.
if ( 'local' === wp_get_environment_type() && '' !== gtm_server_side_e2e_flat_rate_cost() ) {
	// The method's settings, as WooCommerce would have saved them. Not taxed,
	// so a case with tax gets it on the products only.
	add_filter(
		'pre_option_woocommerce_flat_rate_' . GTM_SERVER_SIDE_E2E_FLAT_RATE_INSTANCE . '_settings',
		static function () {
			return array(
				'enabled'    => 'yes',
				'title'      => 'Flat rate',
				'tax_status' => 'none',
				'cost'       => gtm_server_side_e2e_flat_rate_cost(),
			);
		}
	);

	// WooCommerce asks a cart for shipping only while the store counts an
	// enabled method. It counts them in the database and caches the count in
	// a transient, recounting when that is missing or from an older shipping
	// version, so a missing or stale one is answered too, with the current
	// version: WooCommerce then takes it as it is and writes nothing.
	add_filter(
		'transient_wc_shipping_method_count',
		static function ( $counts ) {
			$version = WC_Cache_Helper::get_transient_version( 'shipping' );
			if ( ! is_array( $counts ) || ( $counts['version'] ?? '' ) !== $version ) {
				$counts = array(
					'version'  => $version,
					'legacy'   => 0,
					'enabled'  => 0,
					'disabled' => 0,
				);
			}
			$counts['legacy']  = max( 1, (int) ( $counts['legacy'] ?? 0 ) );
			$counts['enabled'] = max( 1, (int) ( $counts['enabled'] ?? 0 ) );
			return $counts;
		}
	);

	// The method itself, in zone 0, wherever WooCommerce reads methods from the
	// database: the zone lists it for the cart, and the order's shipping line
	// looks it up by instance ID for its tax status when the order is totalled.
	add_filter(
		'woocommerce_shipping-zone_data_store',
		static function () {
			if ( ! class_exists( 'GTM_Server_Side_E2E_Shipping_Zone_Data_Store', false ) ) {
				/** The shipping zone data store, plus the flat rate of this plugin. */
				class GTM_Server_Side_E2E_Shipping_Zone_Data_Store extends WC_Shipping_Zone_Data_Store {
					/** The method as its database row would read. */
					private function flat_rate_row(): object {
						return (object) array(
							'zone_id'      => 0,
							'method_id'    => 'flat_rate',
							'instance_id'  => GTM_SERVER_SIDE_E2E_FLAT_RATE_INSTANCE,
							'method_order' => 1,
							'is_enabled'   => 1,
						);
					}

					// phpcs:ignore Squiz.Commenting.FunctionComment.Missing -- see the parent.
					public function get_methods( $zone_id, $enabled_only ) {
						$methods = parent::get_methods( $zone_id, $enabled_only );
						if ( 0 === (int) $zone_id ) {
							$methods[] = $this->flat_rate_row();
						}
						return $methods;
					}

					// phpcs:ignore Squiz.Commenting.FunctionComment.Missing -- see the parent.
					public function get_method( $instance_id ) {
						return GTM_SERVER_SIDE_E2E_FLAT_RATE_INSTANCE === (int) $instance_id
							? $this->flat_rate_row()
							: parent::get_method( $instance_id );
					}
				}
			}
			return 'GTM_Server_Side_E2E_Shipping_Zone_Data_Store';
		}
	);
}
