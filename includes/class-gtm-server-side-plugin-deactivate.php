<?php
/**
 * _Deactivate plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * _Deactivate plugin.
 */
class GTM_Server_Side_Plugin_Deactivate {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		GTM_Server_Side_Cron_Data_Manager_Ingest::instance()->deactivation();
	}
}
