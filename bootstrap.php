<?php
/**
 * Bootstrap file.
 *
 * @package    stape
 */

defined( 'ABSPATH' ) || exit;

// Definitions.
define( 'GTM_SERVER_SIDE_PATH', plugin_dir_path( __FILE__ ) );
define( 'GTM_SERVER_SIDE_URL', plugin_dir_url( __FILE__ ) );

define( 'GTM_SERVER_SIDE_AJAX_SECURITY', 'gtm-server-side-admin__xyz' );

define( 'GTM_SERVER_SIDE_ADMIN_SLUG', 'gtm-server-side-admin-settings' );
define( 'GTM_SERVER_SIDE_COOKIE_KEEPER_NAME', '_sbp' );

define( 'GTM_SERVER_SIDE_DATA_LAYER_CUSTOM_EVENT_NAME', '_stape' );

define( 'GTM_SERVER_SIDE_FIELD_VERSION', 'gtm_server_side_version' );
define( 'GTM_SERVER_SIDE_FIELD_PLACEMENT', 'gtm_server_side_placement' );
define( 'GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID', 'gtm_server_side_web_container_id' );
define( 'GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL', 'gtm_server_side_web_container_url' );
define( 'GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER', 'gtm_server_side_web_identifier' );
define( 'GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER', 'gtm_server_side_cookie_keeper' );
define( 'GTM_SERVER_SIDE_FIELD_DATA_LAYER_ECOMMERCE', 'gtm_server_side_data_layer_ecommerce' );
define( 'GTM_SERVER_SIDE_FIELD_DATA_LAYER_USER_DATA', 'gtm_server_side_data_layer_user_data' );
define( 'GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME', 'gtm_server_side_data_layer_custom_event_name' );
define( 'GTM_SERVER_SIDE_FIELD_WEBHOOKS_ENABLE', 'gtm_server_side_webhooks_enable' );
define( 'GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL', 'gtm_server_side_webhooks_container_url' );
define( 'GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE', 'gtm_server_side_webhooks_purchase' );
define( 'GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING', 'gtm_server_side_webhooks_processing' );
define( 'GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND', 'gtm_server_side_webhooks_refund' );

define( 'GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE', 'code' );
define( 'GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN', 'plugin' );
define( 'GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE', 'disable' );
define( 'GTM_SERVER_SIDE_FIELD_VALUE_YES', 'yes' );

define( 'GTM_SERVER_SIDE_ADMIN_GROUP', 'gtm-server-side-admin-group' );
define( 'GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL', 'gtm-server-side-admin-group-general' );
define( 'GTM_SERVER_SIDE_ADMIN_GROUP_DATA_LAYER', 'gtm-server-side-admin-group-data-layer' );
define( 'GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS', 'gtm-server-side-admin-group-webhooks' );

// Autoload plugin classes.
spl_autoload_register(
	function ( $class ) {
		if ( 0 === strpos( $class, 'GTM_Server_Side' ) ) {
			$file_name = 'class-' . str_replace( '_', '-', strtolower( $class ) );
			include_once GTM_SERVER_SIDE_PATH . 'includes' . DIRECTORY_SEPARATOR . $file_name . '.php';
		}
	}
);

// Create custom hooks.
add_action(
	'plugins_loaded',
	function () {
		do_action( 'gtm_server_side' );
		if ( is_admin() ) {
			do_action( 'gtm_server_side_admin' );
		} else {
			do_action( 'gtm_server_side_frontend' );
		}
	},
	-1
);

/**
 * Return gtm server side version
 *
 * @return string
 */
function get_gtm_server_side_version() {
	static $version;

	if ( null === $version ) {
		$plugin  = get_file_data(
			GTM_SERVER_SIDE_PATH . 'gtm-server-side.php',
			array(
				'version' => 'Version',
			),
			false
		);
		$version = $plugin['version'];
	}

	return $version;
}
