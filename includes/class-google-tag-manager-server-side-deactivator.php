<?php

/**
 * Fired during plugin deactivation.
 *
 * This class defines all code necessary to run during the plugin's deactivation.
 *
 * @since      1.0.0
 * @package    Google_Tag_Manager_Server_Side
 * @subpackage Google_Tag_Manager_Server_Side/includes
 */
class Google_Tag_Manager_Server_Side_Deactivator {

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
