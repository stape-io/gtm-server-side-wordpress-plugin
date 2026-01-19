<?php
/**
 * Customer Loader Options Watcher.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Customer Loader Options Watcher.
 */
class GTM_Server_Side_Customer_Loader_Options_Watcher {
	use GTM_Server_Side_Singleton;

	/**
	 * Is updated.
	 *
	 * @var bool
	 */
	private $is_updated = false;

	/**
	 * Shutdown registered or not.
	 *
	 * @var bool
	 */
	private $shutdown_registered = false;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER, array( $this, 'update_option' ), 10, 2 );
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID, array( $this, 'update_option' ), 10, 2 );
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL, array( $this, 'update_option' ), 10, 2 );
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER, array( $this, 'update_option' ), 10, 2 );
	}

	/**
	 * Hook shutdown.
	 *
	 * @return void
	 */
	public function shutdown() {
		if ( ! $this->is_updated ) {
			return;
		}

		$result = GTM_Server_Side_Customer_Loader_Handler::instance()->send_data();
		if ( is_wp_error( $result ) ) {
			delete_option( GTM_SERVER_SIDE_GTM_CUSTOM_LOADER_FROM_API );
			return;
		}

		if (
			! empty( $result['body'] ) &&
			! empty( $result['body']['jsCode'] )
		) {
			update_option( GTM_SERVER_SIDE_GTM_CUSTOM_LOADER_FROM_API, $result['body']['jsCode'] );
			return;
		}

		delete_option( GTM_SERVER_SIDE_GTM_CUSTOM_LOADER_FROM_API );
	}

	/**
	 * Update option.
	 *
	 * @param  string $old_value Old value.
	 * @param  string $new_value New value.
	 * @return void
	 */
	public function update_option( $old_value, $new_value ) {
		if ( $old_value === $new_value ) {
			return;
		}

		$this->is_updated = true;

		if ( ! $this->shutdown_registered ) {
			$this->shutdown_registered = true;
			add_action( 'shutdown', array( $this, 'shutdown' ) );
		}
	}
}
