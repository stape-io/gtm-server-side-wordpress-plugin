<?php
/**
 * Activate plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Activate plugin.
 */
class GTM_Server_Side_Plugin_Activate {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! empty( get_option( 'gtm-server-side-admin-options' ) ) ) {
			return;
		}
		$this->install();
	}

	/**
	 * First install.
	 *
	 * @return void
	 */
	private function install() {
		if ( empty( get_option( GTM_SERVER_SIDE_FIELD_PLACEMENT ) ) ) {
			update_option( GTM_SERVER_SIDE_FIELD_PLACEMENT, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE );
		}
	}
}
