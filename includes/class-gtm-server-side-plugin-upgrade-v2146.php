<?php
/**
 * Upgrade to version 2.1.46.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Upgrade to version 2.1.46.
 */
class GTM_Server_Side_Plugin_Upgrade_V2146 {

	const HOOK    = 'gtm_server_side_clear_processed_orders_meta';
	const BATCH   = 500;
	const VERSION = '2.1.46';

	/**
	 * Upgrade instance.
	 *
	 * @var GTM_Server_Side_Plugin_Upgrade
	 */
	private $upgrade;

	/**
	 * Container identifiers.
	 *
	 * @var array
	 */
	private $containers = array(
		'slefxazp',
	);

	/**
	 * Constructor.
	 *
	 * @param GTM_Server_Side_Plugin_Upgrade $upgrade Upgrade instance.
	 */
	public function __construct( GTM_Server_Side_Plugin_Upgrade $upgrade ) {
		$this->upgrade = $upgrade;

		if ( ! $this->is_allow_container() ) {
			return;
		}

		add_action( self::HOOK, array( $this, 'clear_processed_orders_meta_batch' ) );
		add_filter( 'woocommerce_order_data_store_cpt_get_orders_query', array( $this, 'woocommerce_order_data_store_cpt_get_orders_query' ), 10, 2 );
	}

	/**
	 * Upgrade to version 2.1.46.
	 *
	 * @return void
	 */
	public function upgrade() {
		if ( version_compare( $this->upgrade->get_version(), self::VERSION, '>=' ) ) {
			return;
		}
		update_option( GTM_SERVER_SIDE_FIELD_VERSION, self::VERSION, false );

		if ( ! $this->is_allow_container() ) {
			return;
		}

		update_option( GTM_SERVER_SIDE_CUST_MATCH_BACKFILL_DATE, wp_date( 'Y-m-d H:i:s' ), false );
		delete_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL );
		delete_option( GTM_SERVER_SIDE_CUST_MATCH_BACKFILL_FINISHED );
		delete_option( GTM_Server_Side_Data_Manager_Ingest_Cron::EMAIL_PROCESSED );
		$this->schedule_clear_processed_orders_meta();
	}

	/**
	 * Schedule cron for cleanup of processed orders meta.
	 *
	 * @return void
	 */
	private function schedule_clear_processed_orders_meta() {
		if ( wp_next_scheduled( self::HOOK ) ) {
			return;
		}

		wp_schedule_single_event( time() + 25, self::HOOK );
	}

	/**
	 * Cleanup one batch of processed orders meta via WooCommerce API.
	 *
	 * @return void
	 */
	public function clear_processed_orders_meta_batch() {
		if ( ! class_exists( 'WC_Order_Query' ) ) {
			return;
		}

		$params = array(
			'type'                                        => array( 'shop_order', 'shop_order_refund' ),
			'status'                                      => 'any',
			'orderby'                                     => 'ID',
			'order'                                       => 'ASC',
			'limit'                                       => self::BATCH,
			'return'                                      => 'ids',
			'gtm_server_side_clear_processed_orders_meta' => true,
			'meta_query'                                  => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => GTM_Server_Side_Data_Manager_Ingest_Cron::META_KEY_PROCESSED,
					'compare' => 'EXISTS',
				),
			),
		);

		$query     = new WC_Order_Query( $params );
		$order_ids = $query->get_orders();

		if ( empty( $order_ids ) ) {
			return;
		}

		foreach ( $order_ids as $order_id ) {
			$order = wc_get_order( $order_id );
			if ( ! $order instanceof WC_Order ) {
				continue;
			}

			$order->delete_meta_data( GTM_Server_Side_Data_Manager_Ingest_Cron::META_KEY_PROCESSED );
			$order->save_meta_data();
		}

		if ( count( $order_ids ) >= self::BATCH ) {
			$this->schedule_clear_processed_orders_meta();
		}
	}

	/**
	 * Hook: woocommerce_order_data_store_cpt_get_orders_query.
	 *
	 * @param  array $query Query.
	 * @param  array $query_vars Query vars.
	 * @return array
	 */
	public function woocommerce_order_data_store_cpt_get_orders_query( $query, $query_vars ) {
		if ( ! empty( $query_vars['gtm_server_side_clear_processed_orders_meta'] ) ) {
			$query['meta_query'][] = array(
				'key'     => GTM_Server_Side_Data_Manager_Ingest_Cron::META_KEY_PROCESSED,
				'compare' => 'EXISTS',
			);
		}

		return $query;
	}

	/**
	 * Check if the upgrade is allowed to run based on the container identifier.
	 *
	 * @return bool
	 */
	private function is_allow_container() {
		return in_array( GTM_Server_Side_Helpers::get_raw_gtm_container_identifier(), $this->containers, true );
	}
}
