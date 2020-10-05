<?php

/**
 * @link              https://gtm-server.com
 * @since             1.0.0
 * @package           Google_Tag_Manager_Server_Side
 *
 * @wordpress-plugin
 * Plugin Name:       Google Tag Manager Server-Side for WordPress
 * Plugin URI:        https://wordpress.org/plugins/google-tag-manager-server-side/
 * Description:       Google Tag Manager Server-Side Integration Made Easy
 * Version:           1.0.0
 * Author:            GTM Server
 * Author URI:        https://gtm-server.com
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       google-tag-manager-server-side
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 */
define( 'GOOGLE_TAG_MANAGER_SERVER_SIDE_VERSION', '1.0.0' );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-google-tag-manager-server-side-activator.php
 */
function activate_google_tag_manager_server_side() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-google-tag-manager-server-side-activator.php';
	Google_Tag_Manager_Server_Side_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-google-tag-manager-server-side-deactivator.php
 */
function deactivate_google_tag_manager_server_side() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-google-tag-manager-server-side-deactivator.php';
	Google_Tag_Manager_Server_Side_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_google_tag_manager_server_side' );
register_deactivation_hook( __FILE__, 'deactivate_google_tag_manager_server_side' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-google-tag-manager-server-side.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_google_tag_manager_server_side() {

	$plugin = new Google_Tag_Manager_Server_Side();
	$plugin->run();

}
run_google_tag_manager_server_side();
