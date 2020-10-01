<?php

/**
 * @package    Google_Tag_Manager_Server_Side
 * @subpackage Google_Tag_Manager_Server_Side/public
 */
class Google_Tag_Manager_Server_Side_Public {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $google_tag_manager_server_side    The ID of this plugin.
	 */
	private $google_tag_manager_server_side;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $google_tag_manager_server_side       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $google_tag_manager_server_side, $version ) {

		$this->google_tag_manager_server_side = $google_tag_manager_server_side;
		$this->version = $version;

	}

}
