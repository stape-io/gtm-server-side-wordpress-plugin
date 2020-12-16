<?php

define( 'GTM_SERVER_SIDE_BASENAME', 'gtm-server-side' );
define( 'GTM_SERVER_SIDE_TRANSLATION_DOMAIN', 'gtm-server-side' );
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

include 'class-gtm-server-side-collect-data-order.php';

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
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */
class GTM_Server_Side {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      GTM_Server_Side_Loader $loader Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $gtm_server_side The string used to uniquely identify this plugin.
	 */
	protected $gtm_server_side;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string $version The current version of the plugin.
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
		if ( defined( 'GTM_SERVER_SIDE_VERSION' ) ) {
			$this->version = GTM_SERVER_SIDE_VERSION;
		} else {
			$this->version = '1.0.0';
		}
		$this->gtm_server_side = 'gtm-server-side';

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
	 * - GTM_Server_Side_Loader. Orchestrates the hooks of the plugin.
	 * - GTM_Server_Side_i18n. Defines internationalization functionality.
	 * - GTM_Server_Side_Admin. Defines all hooks for the admin area.
	 * - GTM_Server_Side_Public. Defines all hooks for the public side of the site.
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
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-gtm-server-side-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-gtm-server-side-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in the admin area.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-gtm-server-side-admin.php';

		/**
		 * The class responsible for defining all actions that occur in the public-facing
		 * side of the site.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-gtm-server-side-public.php';

		$this->loader = new GTM_Server_Side_Loader();

	}

	/**
	 * Define the locale for this plugin for internationalization.
	 *
	 * Uses the GTM_Server_Side_i18n class in order to set the domain and to register the hook
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function set_locale() {

		$plugin_i18n = new GTM_Server_Side_i18n();

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

		$plugin_admin = new GTM_Server_Side_Admin();

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

		$plugin_public = new GTM_Server_Side_Public( $this->get_gtm_server_side(), $this->get_version() );

		$this->loader->add_action( 'send_headers', $plugin_public, 'track_cookie_set' );

		if ($this->woocommerce_version_check()) {
			add_action('woocommerce_thankyou', array($plugin_public, 'track_add_order_data'));
			add_action('woocommerce_add_to_cart', array($plugin_public, 'track_event_add_to_cart'));
			add_action('woocommerce_after_single_product', array($plugin_public, 'track_add_pdp_view_data'));
			add_action('woocommerce_after_cart', array($plugin_public, 'track_add_cart_data'));
			add_action('woocommerce_after_checkout_form', array($plugin_public, 'track_add_checkout_data'));
		}

		$this->loader->add_action( 'wp_footer', $plugin_public, 'track_pageview' );
		$this->loader->add_action( 'wp_head', $plugin_public, 'gtm_head' );

		$this->loader->add_action( 'body_open', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'wp_body_open', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'genesis_before', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'tha_body_top', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'body_top', $plugin_public, 'gtm_body' );
		$this->loader->add_action( 'wp_footer', $plugin_public, 'gtm_body' );

		$pluginList = get_option( 'active_plugins' );
		if ( in_array( 'duracelltomi-google-tag-manager/duracelltomi-google-tag-manager-for-wordpress.php', $pluginList, true ) ) {
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
	 * @return    string    The name of the plugin.
	 * @since     1.0.0
	 */
	public function get_gtm_server_side() {
		return $this->gtm_server_side;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @return    GTM_Server_Side_Loader    Orchestrates the hooks of the plugin.
	 * @since     1.0.0
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @return    string    The version number of the plugin.
	 * @since     1.0.0
	 */
	public function get_version() {
		return $this->version;
	}

	private function woocommerce_version_check($version = '3.0')
	{
		if (preg_grep('/woocommerce[\-0-9\.]{0,6}\/woocommerce\.php/', apply_filters('active_plugins', get_option('active_plugins'))) != array()) {
			if (version_compare($this->get_woo_version_number(), $version, ">=")) {
				return true;
			}
		}
		return false;
	}

	private function get_woo_version_number()
	{
		// If get_plugins() isn't available, require it
		if (!function_exists('get_plugins')) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		// Create the plugins folder and file variables
		$plugin_folder = get_plugins('/' . 'woocommerce');
		$plugin_file = 'woocommerce.php';

		// If the plugin version number is set, return it
		if (isset($plugin_folder[$plugin_file]['Version'])) {
			return $plugin_folder[$plugin_file]['Version'];

		}

		return "1.0";
	}
}
