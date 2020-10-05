<?php

define( 'GTM_SERVER_SIDE_BASENAME', 'google-tag-manager-server-side' );
define( 'GTM_SERVER_SIDE_TRANSLATION_DOMAIN', 'google-tag-manager-server-side' );
define( 'GTM_SERVER_SIDE_COOKIE_NAME', '_gtm_ssc' );

define( 'GTM_SERVER_SIDE_ADMIN_SLUG', 'gtm-server-side-admin-settings' );
define( 'GTM_SERVER_SIDE_ADMIN_OPTIONS', 'gtm-server-side-admin-options' );

define( 'GTM_SERVER_SIDE_ADMIN_GROUP', 'gtm-server-side-admin-group' );
define( 'GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL', 'gtm-server-side-admin-group-general' );

define( 'GTM_SERVER_SIDE_SERVER_CONTAINER_URL', 'gtm-server-side-server-container-url' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_ID', 'gtm-server-side-web-container-id' );
define( 'GTM_SERVER_SIDE_GA_ID', 'gtm-server-side-ga-id' );

define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT', 'gtm-server-side-placement' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN', 'gtm-server-side-placement-plugin' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE', 'gtm-server-side-placement-code' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF', 'gtm-server-side-placement-off' );

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    Google_Tag_Manager_Server_Side
 * @subpackage Google_Tag_Manager_Server_Side/includes
 */
class Google_Tag_Manager_Server_Side {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      Google_Tag_Manager_Server_Side_Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $google_tag_manager_server_side    The string used to uniquely identify this plugin.
	 */
	protected $google_tag_manager_server_side;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $version    The current version of the plugin.
	 */
	protected $version;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		if ( defined( 'GOOGLE_TAG_MANAGER_SERVER_SIDE_VERSION' ) ) {
			$this->version = GOOGLE_TAG_MANAGER_SERVER_SIDE_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->google_tag_manager_server_side = 'google-tag-manager-server-side';

		$this->load_dependencies();
		$this->set_locale();
		$this->define_admin_hooks();
		$this->define_public_hooks();

	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Include the following files that make up the plugin:
	 *
	 * - Google_Tag_Manager_Server_Side_Loader. Orchestrates the hooks of the plugin.
	 * - Google_Tag_Manager_Server_Side_i18n. Defines internationalization functionality.
	 * - Google_Tag_Manager_Server_Side_Admin. Defines all hooks for the admin area.
	 * - Google_Tag_Manager_Server_Side_Public. Defines all hooks for the public side of the site.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		/**
		 * The class responsible for orchestrating the actions and filters of the
		 * core plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-google-tag-manager-server-side-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-google-tag-manager-server-side-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in the admin area.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-google-tag-manager-server-side-admin.php';

		/**
		 * The class responsible for defining all actions that occur in the public-facing
		 * side of the site.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-google-tag-manager-server-side-public.php';

		$this->loader = new Google_Tag_Manager_Server_Side_Loader();

	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the Google_Tag_Manager_Server_Side_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function set_locale() {

		$plugin_i18n = new Google_Tag_Manager_Server_Side_i18n();

		$this->loader->add_action( 'plugins_loaded', $plugin_i18n, 'load_plugin_textdomain' );

	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new Google_Tag_Manager_Server_Side_Admin();

		$this->loader->add_action( 'admin_init', $plugin_admin, 'admin_init' );
		$this->loader->add_action( 'admin_menu', $plugin_admin, 'display_admin_page' );
		$this->loader->add_filter( 'plugin_action_links', $plugin_admin, 'add_plugin_action_links', 10, 2 );
	}

	/**
	 * Register all of the hooks related to the public-facing functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$plugin_public = new Google_Tag_Manager_Server_Side_Public( $this->get_google_tag_manager_server_side(), $this->get_version() );

		$this->loader->add_action( 'send_headers', $plugin_public, 'track_cookie_set' );
		$this->loader->add_action( 'wp_footer', $plugin_public, 'track_pageview' );

		$this->loader->add_action( 'wp_head', $plugin_public, 'gtm_head' );

		$this->loader->add_action( 'body_open', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'wp_body_open', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'genesis_before', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'tha_body_top', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'body_top', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'wp_footer', $plugin_public, 'gtm_body' );

		$pluginList = get_option( 'active_plugins' );
		if ( in_array( 'duracelltomi-google-tag-manager/duracelltomi-google-tag-manager-for-wordpress.php' , $pluginList, true ) ) {
			$this->loader->add_filter( 'gtm4wp_get_the_gtm_tag', $plugin_public, 'gtm4wp_filter' );
		}
	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @since     1.0.0
	 * @return    string    The name of the plugin.
	 */
	public function get_google_tag_manager_server_side() {
		return $this->google_tag_manager_server_side;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     1.0.0
	 * @return    Google_Tag_Manager_Server_Side_Loader    Orchestrates the hooks of the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @since     1.0.0
	 * @return    string    The version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}

}
