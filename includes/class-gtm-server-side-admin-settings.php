<?php
/**
 * The admin-specific functionality of the plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * The admin-specific functionality of the plugin.
 */
class GTM_Server_Side_Admin_Settings {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_init', array( $this, 'admin_init' ) );
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_filter( 'plugin_action_links', array( $this, 'plugin_action_links' ), 10, 2 );
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER, array( $this, 'clear_cache_field' ), 10, 2 );
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID, array( $this, 'clear_cache_field' ), 10, 2 );
		add_action( 'update_option_' . GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL, array( $this, 'change_option_backfill' ), 10, 2 );
	}

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function admin_init() {

		switch ( self::get_settings_tab() ) :
			case 'data-layer':
				GTM_Server_Side_Admin_Settings_Data_Layer::tab();
				break;
			case 'webhooks':
				GTM_Server_Side_Admin_Settings_Webhooks::tab();
				break;
			case 'customer-match':
				GTM_Server_Side_Admin_Settings_Customer_Match::tab();
				break;
			case 'general':
			default:
				GTM_Server_Side_Admin_Settings_General::tab();
				break;
		endswitch;
	}

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function admin_menu() {
		add_options_page(
			__( 'GTM Server Side', 'gtm-server-side' ),
			__( 'GTM Server Side', 'gtm-server-side' ),
			'manage_options',
			GTM_SERVER_SIDE_ADMIN_SLUG,
			function() {
				wp_enqueue_style( 'gtm-server-side-admin' );
				wp_enqueue_script( 'gtm-server-side-admin' );

				load_template( GTM_SERVER_SIDE_PATH . 'templates/class-gtm-server-side-admin.php', false );
			},
			27
		);
	}

	/**
	 * Add plugin links.
	 *
	 * @param array  $links Links.
	 * @param string $file File.
	 *
	 * @return mixed
	 */
	public function plugin_action_links( $links, $file ) {
		if ( strpos( $file, '/gtm-server-side.php' ) === false ) {
			return $links;
		}

		$settings_link = '<a href="' . menu_page_url( GTM_SERVER_SIDE_ADMIN_SLUG, false ) . '">' . esc_html( __( 'Settings' ) ) . '</a>';

		array_unshift( $links, $settings_link );

		return $links;
	}

	/**
	 * Clear cache field, after update some fields.
	 *
	 * @param  string $old_value Old value.
	 * @param  string $new_value New value.
	 * @return void
	 */
	public function clear_cache_field( $old_value, $new_value ) {
		if ( $old_value !== $new_value ) {
			GTM_Server_Side_Helpers::delete_cache_field( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID );
			GTM_Server_Side_Helpers::delete_cache_field( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER );
		}
	}

	/**
	 * Change option backfill.
	 *
	 * @param  string $old_value Old value.
	 * @param  string $new_value New value.
	 * @return void
	 */
	public function change_option_backfill( $old_value, $new_value ) {
		if ( GTM_SERVER_SIDE_FIELD_VALUE_YES !== $new_value ) {
			GTM_Server_Side_Cron_Data_Manager_Ingest::instance()->deactivation();
		}
	}

	/**
	 * Return settings tab.
	 *
	 * @return string
	 */
	public static function get_settings_tab() {
		$tab = filter_input( INPUT_GET, 'tab', FILTER_DEFAULT );
		if ( ! empty( $tab ) ) {
			return $tab;
		}
		$tab = filter_input( INPUT_POST, 'tab', FILTER_DEFAULT );
		if ( ! empty( $tab ) ) {
			return $tab;
		}
		return 'general';
	}
}
