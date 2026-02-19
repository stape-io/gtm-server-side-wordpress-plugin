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
class GTM_Server_Side_Customer_Loader_Cron {
	use GTM_Server_Side_Singleton;

	const HOOK         = 'gtm_server_side_customer_loader_cron';
	const ORDERS_LIMIT = 50;

	const INTERVAL_NAME = '3h';
	const INTERVAL_TIME = HOUR_IN_SECONDS * 3;


	/**
	 * Init.
	 *
	 * @return void
	 */
	protected function init() {
		if ( GTM_Server_Side_Helpers::has_gtm_custom_loader_from_api() ) {
			return;
		}

		add_action( 'init', array( $this, 'activation' ) );
		add_filter( 'cron_schedules', array( $this, 'cron_schedules' ) ); // phpcs:ignore WordPress.WP.CronInterval.ChangeDetected
		add_action( self::HOOK, array( $this, 'run' ) );
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
	 * Run actions.
	 *
	 * @return void
	 */
	public function run() {
		if ( GTM_Server_Side_Helpers::has_gtm_custom_loader_from_api() ) {
			$this->deactivation();
			return;
		}

		$result = GTM_Server_Side_Customer_Loader_Handler::instance()->send_data();
		if ( is_wp_error( $result ) ) {
			return;
		}

		if (
			! empty( $result['body'] ) &&
			! empty( $result['body']['jsCode'] )
		) {
			update_option( GTM_SERVER_SIDE_GTM_CUSTOM_LOADER_FROM_API, $result['body']['jsCode'] );
			$this->deactivation();
		}
	}
}
