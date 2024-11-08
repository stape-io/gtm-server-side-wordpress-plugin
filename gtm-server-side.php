<?php
/**
 * Main plugin file.
 *
 * @link              https://stape.io
 * @since             2.0.0
 * @package           GTM_Server_Side
 *
 * @wordpress-plugin
 * Plugin Name:       GTM Server Side
 * Plugin URI:        https://wordpress.org/plugins/gtm-server-side/
 * Description:       Enhance conversion tracking by implementing server-side tagging using server Google Tag Manager container. Effortlessly configure data layer events in web GTM, send webhooks, set up custom loader, and extend cookie lifetime.
 * Version:           2.1.23
 * Author:            Stape
 * Author URI:        https://stape.io
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       gtm-server-side
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

/**
 * Bootstrap.
 */
require plugin_dir_path( __FILE__ ) . 'bootstrap.php';

register_activation_hook( __FILE__, array( GTM_Server_Side_Plugin_Activate::class, 'instance' ) );

add_action( 'init', array( GTM_Server_Side_Plugin_Upgrade::class, 'instance' ) );
add_action( 'gtm_server_side', array( GTM_Server_Side_I18n::class, 'instance' ) );
add_action( 'gtm_server_side', array( GTM_Server_Side_Webhook_Purchase::class, 'instance' ) );
add_action( 'gtm_server_side', array( GTM_Server_Side_Webhook_Processing::class, 'instance' ) );
add_action( 'gtm_server_side', array( GTM_Server_Side_Webhook_Refund::class, 'instance' ) );
add_action( 'gtm_server_side_admin', array( GTM_Server_Side_Admin_Settings::class, 'instance' ) );
add_action( 'gtm_server_side_admin', array( GTM_Server_Side_Admin_Ajax::class, 'instance' ) );
add_action( 'gtm_server_side_admin', array( GTM_Server_Side_Admin_Assets::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Frontend_Assets::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Tracking_Code::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Tracking_Gtm4wp::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_Home::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_Login::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_Register::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_ViewItem::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_ViewItemList::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_ViewCart::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_BeginCheckout::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_Purchase::class, 'instance' ) );
add_action( 'gtm_server_side_frontend', array( GTM_Server_Side_Event_AddToCart::class, 'instance' ) );
