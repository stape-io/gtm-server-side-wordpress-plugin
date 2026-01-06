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
		add_action( 'login_footer', array( $this, 'wp_footer' ) );
	}

	/**
	 * WP login hook.
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	public function user_register( $user_id ) {
		update_user_meta( $user_id, self::CHECK_NAME, GTM_SERVER_SIDE_FIELD_VALUE_YES );
	}

	/**
	 * WP footer hook.
	 *
	 * @return void
	 */
	public function wp_footer() {
		if ( ! is_user_logged_in() ) {
			return;
		}

		$user_id = get_current_user_id();
		if ( get_user_meta( $user_id, self::CHECK_NAME, true ) !== GTM_SERVER_SIDE_FIELD_VALUE_YES ) {
			return;
		}

		$data_layer = array(
			'event' => GTM_Server_Side_Helpers::get_data_layer_event_name( 'sign_up' ),
		);

		if ( GTM_Server_Side_WC_Helpers::instance()->is_enable_user_data() ) {
			$data_layer['user_data'] = GTM_Server_Side_WC_Helpers::instance()->get_data_layer_user_data();
		}
		?>
		<script type="text/javascript">
			dataLayer.push( { ecommerce: null } );
			dataLayer.push(<?php echo GTM_Server_Side_Helpers::array_to_json( $data_layer ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>);
		</script>
		<?php
		delete_user_meta( $user_id, self::CHECK_NAME );
	}
}
