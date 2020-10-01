<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @package    Google_Tag_Manager_Server_Side
 * @subpackage Google_Tag_Manager_Server_Side/admin
 */
class Google_Tag_Manager_Server_Side_Admin {

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
	 * @param      string    $google_tag_manager_server_side       The name of this plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $google_tag_manager_server_side, $version ) {

		$this->google_tag_manager_server_side = $google_tag_manager_server_side;
		$this->version = $version;

	}

	/**
	 * Register the stylesheets for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_styles() {

		wp_enqueue_style( $this->google_tag_manager_server_side, plugin_dir_url( __FILE__ ) . 'css/google-tag-manager-server-side-admin.css', array(), $this->version, 'all' );

	}

	/**
	 * Register the JavaScript for the admin area.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {

		wp_enqueue_script( $this->google_tag_manager_server_side, plugin_dir_url( __FILE__ ) . 'js/google-tag-manager-server-side-admin.js', array( 'jquery' ), $this->version, false );

	}

}
