<?php
/**
 * Data Layer Event: login.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Data Layer Event: login.
 */
class GTM_Server_Side_Event_Login {
	use GTM_Server_Side_Singleton;

	/**
	 * Cookie name.
	 *
	 * @var string
	 */
	const CHECK_NAME = 'gtm_server_side_login';

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! GTM_Server_Side_WC_Helpers::instance()->is_enable_ecommerce() ) {
			return;
		}

		add_action( 'wp_login', array( $this, 'wp_login' ) );
		add_action( 'wp_footer', array( $this, 'wp_footer' ) );

	}

	/**
	 * WP login hook.
	 *
	 * @return void
	 */
	public function wp_login() {
		GTM_Server_Side_Helpers::set_session( self::CHECK_NAME, GTM_SERVER_SIDE_FIELD_VALUE_YES );
	}

	/**
	 * WP footer hook.
	 *
	 * @return void
	 */
	public function wp_footer() {
		if ( ! GTM_Server_Side_Helpers::exists_session( self::CHECK_NAME, GTM_SERVER_SIDE_FIELD_VALUE_YES ) ) {
			return;
		}

		$data_layer = array(
			'event' => GTM_Server_Side_Helpers::get_data_layer_event_name( 'login' ),
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
		GTM_Server_Side_Helpers::javascript_delete_cookie( self::CHECK_NAME );
	}
}
