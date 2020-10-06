<?php

/**
 * Fired during plugin deactivation.
 *
 * This class defines all code necessary to run during the plugin's deactivation.
 *
 * @since      1.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */
class GTM_Server_Side_Deactivator {

	/**
	 * Short Description. (use period)
	 *
	 * Long Description.
	 *
	 * @since    1.0.0
	 */
	public static function deactivate() {
		if (!current_user_can('activate_plugins')) {
			return;
		}
	}
}
