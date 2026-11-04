<?php
/**
 * Data Layer Event: register.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: register.
 */
class GTM_Server_Side_Event_Register {
	use GTM_Server_Side_Singleton;

	/**
	 * Cookie name.
	 *
	 * @var string
	 */
	const CHECK_NAME = 'gtm_server_side_register';

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! GTM_Server_Side_WC_Helpers::instance()->is_enable_ecommerce() ) {
			return;
		}

		add_action( 'user_register', array( $this, 'user_register' ) );
		add_action( 'wp_footer', array( $this, 'wp_footer' ) );
	}

	/**
	 * WP login hook.
	 *
	 * @return void
	 */
	public function user_register() {
		GTM_Server_Side_Helpers::set_session( self::CHECK_NAME, GTM_SERVER_SIDE_FIELD_VALUE_YES );
	}

	/**
	 * WP footer hook.
	 *
	 * Not on login_footer: wp-login.php prints no GTM snippet, so the flag
	 * waits for the first storefront page. user_register also fires when staff
	 * create a user in wp-admin, which puts the flag in their browser: an
	 * excluded role drops it without pushing, so it can't fire once they log out.
	 *
	 * @return void
	 */
	public function wp_footer() {
		if ( ! GTM_Server_Side_Helpers::exists_session( self::CHECK_NAME, GTM_SERVER_SIDE_FIELD_VALUE_YES ) ) {
			return;
		}

		if ( GTM_Server_Side_Helpers::is_current_user_gtm_excluded() ) {
			GTM_Server_Side_Helpers::javascript_delete_cookie( self::CHECK_NAME );
			return;
		}

		$data_layer = array(
			'event' => GTM_Server_Side_Helpers::get_data_layer_event_name( 'sign_up' ),
		);

		if ( GTM_Server_Side_WC_Helpers::instance()->is_enable_user_data() ) {
			$data_layer['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_user_data();
		}
		GTM_Server_Side_Helpers::print_data_layer_event( $data_layer );
		GTM_Server_Side_Helpers::javascript_delete_cookie( self::CHECK_NAME );
	}
}
