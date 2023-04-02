<?php
/**
 * Assets for admin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Assets for admin.
 */
class GTM_Server_Side_Admin_Assets {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
	}

	/**
	 * Enqueue scripts
	 *
	 * @return void
	 */
	public function admin_enqueue_scripts() {
		wp_register_script( 'vendor-jquery-validation', GTM_SERVER_SIDE_URL . 'assets/vendors/jquery-validation/jquery.validate.min.js', array( 'jquery' ), get_gtm_server_side_version(), true );

		wp_register_style( 'gtm-server-side-admin', GTM_SERVER_SIDE_URL . 'assets/css/admin-style.css', null, get_gtm_server_side_version() );
		wp_register_script( 'gtm-server-side-admin', GTM_SERVER_SIDE_URL . 'assets/js/admin-javascript.js', array( 'vendor-jquery-validation' ), get_gtm_server_side_version(), true );

		wp_localize_script(
			'gtm-server-side-admin',
			'varGtmServerSide',
			array(
				'ajax'     => admin_url( 'admin-ajax.php' ),
				'security' => wp_create_nonce( GTM_SERVER_SIDE_AJAX_SECURITY ),
			)
		);
	}
}
