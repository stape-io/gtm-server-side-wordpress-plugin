<?php
/**
 * Main plugin file.
 *
 * @link              https://stape.io
 * @since             1.0.0
 * @package           GTM_Server_Side
 *
 * @wordpress-plugin
 * Plugin Name:       GTM Server Side
 * Plugin URI:        https://wordpress.org/plugins/gtm-server-side/
 * Description:       Google Tag Manager Server Side Integration Made Easy
 * Version:           1.1.2
 * Author:            Stape
 * Author URI:        https://stape.io
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       gtm-server-side
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 */
define( 'GTM_SERVER_SIDE_VERSION', '1.1.2' );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-gtm-server-side-activator.php
 */
function activate_gtm_server_side() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-gtm-server-side-activator.php';
	GTM_Server_Side_Activator::activate();
}

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-gtm-server-side-deactivator.php
 */
function deactivate_gtm_server_side() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-gtm-server-side-deactivator.php';
	GTM_Server_Side_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_gtm_server_side' );
register_deactivation_hook( __FILE__, 'deactivate_gtm_server_side' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-gtm-server-side.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_gtm_server_side() {

	$plugin = new GTM_Server_Side();
	$plugin->run();

}

run_gtm_server_side();
