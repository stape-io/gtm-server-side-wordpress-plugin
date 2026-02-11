<?php
/**
 * CRON.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * CRON.
 */
class GTM_Server_Side_Data_Manager_Ingest_Cron {
	use GTM_Server_Side_Singleton;

	const HOOK         = 'gtm_server_side_send_api_data_manager_ingest';
	const ORDERS_LIMIT = 50;

	const INTERVAL_NAME = '1h';
	const INTERVAL_TIME = HOUR_IN_SECONDS;

	const META_KEY_PROCESSED = '_gtm_server_side_processed';
	const EMAIL_PROCESSED    = '_gtm_server_side_email_processed';

	/**
	 * Init.
	 *
	 * @return void
	 */
	protected function init() {
		if ( GTM_SERVER_SIDE_FIELD_VALUE_YES !== GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL ) ) {
			return;
		}

		if ( GTM_SERVER_SIDE_FIELD_VALUE_YES === GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_CUST_MATCH_BACKFILL_FINISHED ) ) {
			return;
		}

		if ( empty( GTM_Server_Side_Helpers::get_stape_container_api_key() ) ) {
			return;
		}

		add_action( 'init', array( $this, 'activation' ) );
		add_filter( 'cron_schedules', array( $this, 'cron_schedules' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected
		add_action( self::HOOK, array( $this, 'send' ) );

		add_filter( 'woocommerce_order_data_store_cpt_get_orders_query', array( $this, 'woocommerce_order_data_store_cpt_get_orders_query' ), 10, 2 );
	}

	/**
	 * Activation.
	 *
	 * @return void
	 */
	public function activation() {
		if ( ! wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time(), self::INTERVAL_NAME, self::HOOK );
		}
	}

	/**
	 * Deactivation.
	 *
	 * @return void
	 */
	public function deactivation() {
		wp_clear_scheduled_hook( self::HOOK );
	}

	/**
	 * Filter: cron_schedules.
	 *
	 * @param  array $schedules Schedules.
	 * @return array
	 */
	public function cron_schedules( $schedules ) {
		if ( ! isset( $schedules[ self::INTERVAL_NAME ] ) ) {
			$schedules[ self::INTERVAL_NAME ] = array(
				'interval' => self::INTERVAL_TIME,
			);
		}
		return $schedules;
	}

	/**
	 * Return orders.
	 *
	 * @param  int $limit Limit.
	 * @return array
	 */
	private function get_orders( $limit = 10 ) {
		if ( ! class_exists( 'WC_Order_Query' ) ) {
			return array();
		}

		$params = array(
			'type'                      => 'shop_order',
			'orderby'                   => 'date',
			'order'                     => 'DESC',
			'return'                    => 'ids',
			'limit'                     => $limit,
			'date_query'                => array(
				'before' => GTM_Server_Side_Helpers::get_cust_match_backfill_date(),
			),
			'status'                    => 'any',
			'gtm_server_side_processed' => true,
			'meta_query'                => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => self::META_KEY_PROCESSED,
					'compare' => 'NOT EXISTS',
				),
			),
		);

		$query     = new WC_Order_Query( $params );
		$order_ids = $query->get_orders();

		return $order_ids;
	}

	/**
	 * Send.
	 *
	 * @return void
	 */
	public function send() {
		$order_ids = $this->get_orders( self::ORDERS_LIMIT );
		if ( empty( $order_ids ) ) {

			update_option( GTM_SERVER_SIDE_CUST_MATCH_BACKFILL_FINISHED, GTM_SERVER_SIDE_FIELD_VALUE_YES, false );
			$this->deactivation();

			return;
		}

		$email_processed = get_option( self::EMAIL_PROCESSED, array() );
		if ( empty( $email_processed ) || ! is_array( $email_processed ) ) {
			$email_processed = array();
		}

		$orders     = array();
		$users_data = array();

		$data_manager_ingest = GTM_Server_Side_Handler_Data_Manager_Ingest::instance();

		foreach ( $order_ids as $order_id ) {
			$order = wc_get_order( $order_id );
			if ( ! $order instanceof WC_Order ) {
				continue;
			}

			$user_data = $data_manager_ingest->get_prepared_order_data( $order );
			if ( empty( $user_data['email_address'] ) ) {
				continue;
			}

			if ( in_array( $user_data['email_address'], $email_processed, true ) ) {
				$order->update_meta_data( self::META_KEY_PROCESSED, 'yes' );
				$order->save();

				continue;
			}

			$orders[]          = $order;
			$users_data[]      = $user_data;
			$email_processed[] = $user_data['email_address'];
		}

		if ( ! empty( $users_data ) ) {
			$data_manager_ingest->send_bulk_data( $users_data );
		}

		if ( ! empty( $orders ) ) {
			foreach ( $orders as $order ) {
				$order->update_meta_data( self::META_KEY_PROCESSED, 'yes' );
				$order->save();
			}
		}

		update_option( self::EMAIL_PROCESSED, $email_processed, false );
	}

	/**
	 * Hook: woocommerce_order_data_store_cpt_get_orders_query.
	 *
	 * @param  array $query Query.
	 * @param  array $query_vars Query vars.
	 * @return array
	 */
	public function woocommerce_order_data_store_cpt_get_orders_query( $query, $query_vars ) {
		if ( ! empty( $query_vars['gtm_server_side_processed'] ) ) {
			$query['meta_query'][] = array(
				'key'     => self::META_KEY_PROCESSED,
				'compare' => 'NOT EXISTS',
			);
		}

		return $query;
	}
}
