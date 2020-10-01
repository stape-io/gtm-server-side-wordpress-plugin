<?php

define( 'GTM_SERVER_SIDE_BASENAME', 'google-tag-manager-server-side' );
define( 'GTM_SERVER_SIDE_TRANSLATION_DOMAIN', 'google-tag-manager-server-side' );

define( 'GTM_SERVER_SIDE_ADMIN_SLUG', 'gtm-server-side-admin-settings' );
define( 'GTM_SERVER_SIDE_ADMIN_OPTIONS', 'gtm-server-side-admin-options' );

define( 'GTM_SERVER_SIDE_ADMIN_GROUP', 'gtm-server-side-admin-group' );
define( 'GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL', 'gtm-server-side-admin-group-general' );

define( 'GTM_SERVER_SIDE_SERVER_CONTAINER_URL', 'gtm-server-side-server-container-url' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_ID', 'gtm-server-side-web-container-id' );

define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT', 'gtm-server-side-placement' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN', 'gtm-server-side-placement-plugin' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE', 'gtm-server-side-placement-code' );
define( 'GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF', 'gtm-server-side-placement-off' );

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
	 * @var      string $google_tag_manager_server_side The ID of this plugin.
	 */
	private $google_tag_manager_server_side;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $version The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @param string $google_tag_manager_server_side The name of this plugin.
	 * @param string $version The version of this plugin.
	 *
	 * @since    1.0.0
	 * @noinspection UnusedConstructorDependenciesInspection
	 */
	public function __construct( $google_tag_manager_server_side, $version ) {

		$this->google_tag_manager_server_side = $google_tag_manager_server_side;
		$this->version                        = $version;

	}

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function admin_init() {
		register_setting( GTM_SERVER_SIDE_ADMIN_GROUP, GTM_SERVER_SIDE_ADMIN_OPTIONS );

		add_settings_section(
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			__( 'General', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			[ $this, 'admin_output_section' ],
			GTM_SERVER_SIDE_ADMIN_SLUG
		);

		add_settings_field(
			GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT,
			__( 'Web container code placement type', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			[ $this, 'input_callback_function' ],
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			[
				'label_for'   => GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT,
				'description' => __( 'Choose wisely.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			]
		);

		add_settings_field(
			GTM_SERVER_SIDE_SERVER_CONTAINER_URL,
			__( 'GTM Server-side url', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			[ $this, 'input_callback_function' ],
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			[
				'label_for'   => GTM_SERVER_SIDE_SERVER_CONTAINER_URL,
				'description' => __( 'Enter your Google Tag Manager Server-side url. For example: https://gtm.example.com', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			]
		);

		add_settings_field(
			GTM_SERVER_SIDE_WEB_CONTAINER_ID,
			__( 'Google Tag Manager ID', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			[ $this, 'input_callback_function' ],
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			[
				'label_for'   => GTM_SERVER_SIDE_WEB_CONTAINER_ID,
				'description' => __( 'Valid format: GTM-XXXXX where X can be numbers and capital letters.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			]
		);
	}

	/**
	 * Add input text.
	 *
	 * @param mixed[] $data
	 *
	 * @since    1.0.0
	 */
	function input_callback_function( $data ) {
		$id = $data['label_for'];

		if ( $id === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) {

			//echo  $data['description'].'<br>';
			echo '<input required class="'.GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT.'" type="radio" id="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN . '" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" value="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN . '" ' . ( esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ]) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN ? 'checked="checked"' : '' ) . ' ' . ($this->canPatchOtherPlugin() ? '':'disabled').'/> ' . __( "Update existing GTM web container configuration for working with your server-side container. (This option is not enabled if we can't find an existing web container.)", GTM_SERVER_SIDE_TRANSLATION_DOMAIN ) . '<br />';
			echo '<input required class="'.GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT.'" type="radio" id="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE . '" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" value="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE . '" ' . ( esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ]) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE ? 'checked="checked"' : '' ) . '/> ' . __( 'Add Google Tag Manager web container on all pages.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ) . '<br />';
			echo '<input required class="'.GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT.'" type="radio" id="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF . '" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" value="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF . '" ' . ( esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ]) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF ? 'checked="checked"' : '' ) . '/> ' . __( 'Off - only server-side events will be tracked. This increase page speed because no additional JS will be placed on the page, but only PageView event will be tracked. (We will add more server-side events soon)', GTM_SERVER_SIDE_TRANSLATION_DOMAIN );

			return;
		}

		if ( $id === GTM_SERVER_SIDE_SERVER_CONTAINER_URL ) {

			echo '<input type="url" required pattern="https://.*" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] ) . '"/><br />' . $data['description'];

			return;
		}

		if ( $id === GTM_SERVER_SIDE_WEB_CONTAINER_ID ) {

			echo '<input type="text" pattern="GTM-.*" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] ) . '"/><br />' . $data['description'];

			return;
		}

		echo '<input type="text" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] ) . '"/><br />' . $data['description'];
	}

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function display_admin_page() {
		add_options_page(
			'GTM Server-side',
			'GTM Server-side',
			'manage_options',
			GTM_SERVER_SIDE_ADMIN_SLUG,
			[ $this, 'showOptionsPage' ],
			27
		);

	}

	/**
	 * Add admin page.
	 *
	 * @since    1.0.0
	 */
	public function showOptionsPage() {
		require_once( 'partials/google-tag-manager-server-side-admin-display.php' );
	}

	public function admin_output_section( $args ) {
		echo '<span class="tabinfo">';

		switch ( $args['id'] ) {
			case GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL:
			{
				_e( 'This plugin is intended to be used by IT girls&guys and marketing staff. If you don\'t know what to do follow our <a href="https://gtm-server.com" target="_blank">step by step tutorial</a>.<br />', GTM_SERVER_SIDE_TRANSLATION_DOMAIN );

				break;
			}
		} // end switch

		echo '</span>';
	}

	public function add_plugin_action_links( $links, $file ) {
		if ( strpos( $file, '/' . GTM_SERVER_SIDE_BASENAME . '.php' ) === false ) {
			return $links;
		}

		$settings_link = '<a href="' . menu_page_url( GTM_SERVER_SIDE_ADMIN_SLUG, false ) . '">' . esc_html( __( 'Settings' ) ) . '</a>';

		array_unshift( $links, $settings_link );

		return $links;
	}

	private function canPatchOtherPlugin() {
		return false;
	}
}
