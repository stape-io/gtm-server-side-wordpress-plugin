<?php
/**
 * Upgrade plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Upgrade plugin.
 */
class GTM_Server_Side_Plugin_Upgrade {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		$this->upgrade_2_0_0();
	}

	/**
	 * Upgrade to version 2.0.0.
	 *
	 * @return void
	 */
	private function upgrade_2_0_0() {
		if ( version_compare( get_option( GTM_SERVER_SIDE_FIELD_VERSION, '1.1.4' ), '2.0.0', '>=' ) ) {
			return;
		}

		$options = get_option( 'gtm-server-side-admin-options' );
		if ( ! empty( $options['gtm-server-side-placement'] ) ) {
			if ( 'gtm-server-side-placement-plugin' === $options['gtm-server-side-placement'] ) {
				update_option( GTM_SERVER_SIDE_FIELD_PLACEMENT, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN );
			}
			if ( 'gtm-server-side-placement-code' === $options['gtm-server-side-placement'] ) {
				update_option( GTM_SERVER_SIDE_FIELD_PLACEMENT, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE );
			}
		}

		if ( ! empty( $options['gtm-server-side-server-container-url'] ) ) {
			update_option( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL, $options['gtm-server-side-server-container-url'] );
		}

		if ( ! empty( $options['gtm-server-side-web-container-id'] ) ) {
			update_option( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID, $options['gtm-server-side-web-container-id'] );
		}

		if ( ! empty( $options['gtm-server-side-identifier'] ) ) {
			update_option( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER, $options['gtm-server-side-identifier'] );
		}

		if ( ! empty( $options ) ) {
			delete_option( 'gtm-server-side-admin-options' );
		}

		update_option( GTM_SERVER_SIDE_FIELD_VERSION, '2.0.0', false );
	}
}
