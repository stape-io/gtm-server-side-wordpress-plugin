<?php
/**
 * Define the internationalization functionality.
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @since      1.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @file       class-gtm-server-side-i18n.php
 */

/**
 * Define the internationalization functionality.
 */
class GTM_Server_Side_I18n {


	/**
	 * Load the plugin text domain for translation.
	 *
	 * @since    1.0.0
	 */
	public function load_plugin_textdomain() {

		load_plugin_textdomain(
			'gtm-server-side',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages/'
		);
	}


}
