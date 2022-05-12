<?php
/**
 * The admin-specific functionality of the plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/admin
 * @file       class-gtm-server-side-admin.php
 */

/**
 * The admin-specific functionality of the plugin.
 */
class GTM_Server_Side_Admin {

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function admin_init() {
		register_setting( GTM_SERVER_SIDE_ADMIN_GROUP, GTM_SERVER_SIDE_ADMIN_OPTIONS );

		add_settings_section(
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			__( 'General', 'gtm-server-side' ),
			array( $this, 'admin_output_section' ),
			GTM_SERVER_SIDE_ADMIN_SLUG
		);

		add_settings_field(
			GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT,
			__( 'Web container code placement type', 'gtm-server-side' ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT,
				'description' => __( 'Choose wisely.', 'gtm-server-side' ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_SERVER_CONTAINER_URL,
			__( 'GTM Server Side url', 'gtm-server-side' ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_SERVER_CONTAINER_URL,
				'description' => __( 'Enter your Google Tag Manager server side url. For example: https://gtm.example.com', 'gtm-server-side' ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_WEB_CONTAINER_ID,
			__( 'Google Tag Manager ID', 'gtm-server-side' ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_WEB_CONTAINER_ID,
				'description' => __( 'Valid format: GTM-XXXXX where X can be numbers and capital letters.', 'gtm-server-side' ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_IDENTIFIER,
			__( 'Stape container identifier', 'gtm-server-side' ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_IDENTIFIER,
				'description' => __( 'Use in case you configured <a href="https://stape.io/blog/avoiding-google-tag-manager-blocking-by-adblockers#how-to-avoid-google-tag-manager-blocking-by-ad-blockers" target="_blank">custom web GTM loader power-up</a>.', 'gtm-server-side' ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_GA_ID,
			__( 'GA Property ID', 'gtm-server-side' ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_GA_ID,
				'description' => __( 'Valid format: UA-XXXXXXXXX-X. where X can be numbers. For example: UA-123456789-1.', 'gtm-server-side' ),
			)
		);
	}

	/**
	 * Add input text.
	 *
	 * @param mixed[] $data Data.
	 *
	 * @since    1.0.0
	 */
	public function input_callback_function( $data ) {
		$id = $data['label_for'];

		if ( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT === $id ) {

			echo '<input required class="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) . '" type="radio" id="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN ) . '" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" value="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN ) . '" ' . ( esc_attr( $this->get_option( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) ) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN ? 'checked="checked"' : '' ) . ' ' . ( $this->can_patch_other_plugin() ? '' : 'disabled' ) . '/> ' . esc_html__( "Update existing GTM web container configuration for working with your server-side container. (This option is not enabled if we can't find an existing web container.)", 'gtm-server-side' ) . '<br />';
			echo '<input required class="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) . '" type="radio" id="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE ) . '" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" value="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE ) . '" ' . ( esc_attr( $this->get_option( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) ) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE ? 'checked="checked"' : '' ) . '/> ' . esc_html__( 'Add Google Tag Manager web container on all pages. If you have other GTM plugins, please disable them.', 'gtm-server-side' ) . '<br />';
			echo '<input required class="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) . '" type="radio" id="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF ) . '" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" value="' . esc_attr( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF ) . '" ' . ( esc_attr( $this->get_option( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) ) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF ? 'checked="checked"' : '' ) . '/> ' . esc_html__( 'Off - only server-side events will be tracked. This increase page speed because no additional JS will be placed on the page, but only PageView and Woocommerce events will be tracked.', 'gtm-server-side' );

			return;
		}

		if ( GTM_SERVER_SIDE_SERVER_CONTAINER_URL === $id ) {

			echo '<input type="url" required pattern="https://.*" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" id="' . esc_attr( $id ) . '" value="' . esc_attr( $this->get_option( $id ) ) . '"/><br />' . esc_html( $data['description'] );

			return;
		}

		if ( GTM_SERVER_SIDE_IDENTIFIER === $id ) {

			echo '<input type="text" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" id="' . esc_attr( $id ) . '" value="' . esc_attr( $this->get_option( $id ) ) . '"/><br />' . esc_html( $data['description'] );

			return;
		}

		if ( GTM_SERVER_SIDE_WEB_CONTAINER_ID === $id ) {

			echo '<input type="text" pattern="GTM-.*" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" id="' . esc_attr( $id ) . '" value="' . esc_attr( $this->get_option( $id ) ) . '"/><br />' . esc_html( $data['description'] );

			return;
		}

		if ( GTM_SERVER_SIDE_GA_ID === $id ) {

			echo '<input type="text" pattern="UA-.*-.*" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" id="' . esc_attr( $id ) . '" value="' . esc_attr( $this->get_option( $id ) ) . '"/><br />' . esc_html( $data['description'] );

			return;
		}

		echo '<input type="text" name="' . esc_attr( GTM_SERVER_SIDE_ADMIN_OPTIONS ) . '[' . esc_attr( $id ) . ']" id="' . esc_attr( $id ) . '" value="' . esc_attr( $this->get_option( $id ) ) . '"/><br />' . esc_html( $data['description'] );
	}

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function display_admin_page() {
		add_options_page(
			'GTM Server Side',
			'GTM Server Side',
			'manage_options',
			GTM_SERVER_SIDE_ADMIN_SLUG,
			array( $this, 'show_options_page' ),
			27
		);

	}

	/**
	 * Add admin page.
	 *
	 * @since    1.0.0
	 */
	public function show_options_page() {
		require_once 'partials/gtm-server-side-admin-display.php';
	}

	/**
	 * Admin output section
	 *
	 * @param array $args Arguments.
	 *
	 * @return void
	 */
	public function admin_output_section( $args ) {
		echo '<span class="tabinfo">';

		if ( GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL === $args['id'] ) {
			esc_html_e( 'This plugin is intended to be used by IT girls&guys and marketing staff. If you don\'t know what to do follow our <a href="https://stape.io/how-to-add-google-analytics-and-facebook-pixels-to-wordpress-using-google-tag-manager-server-container/" target="_blank">step by step tutorial</a>.<br />', 'gtm-server-side' );
		} // end switch

		echo '</span>';
	}

	/**
	 * Add plugin links.
	 *
	 * @param array  $links Links.
	 * @param string $file File.
	 *
	 * @return mixed
	 */
	public function add_plugin_action_links( $links, $file ) {
		if ( strpos( $file, '/' . GTM_SERVER_SIDE_BASENAME . '.php' ) === false ) {
			return $links;
		}

		$settings_link = '<a href="' . menu_page_url( GTM_SERVER_SIDE_ADMIN_SLUG, false ) . '">' . esc_html( __( 'Settings' ) ) . '</a>';

		array_unshift( $links, $settings_link );

		return $links;
	}

	/**
	 * Check if GTM plugin is enabled.
	 *
	 * @return bool
	 */
	private function can_patch_other_plugin() {
		if ( is_plugin_active( 'duracelltomi-google-tag-manager/duracelltomi-google-tag-manager-for-wordpress.php' ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Get option.
	 *
	 * @param string $id The option id.
	 *
	 * @return mixed
	 */
	protected function get_option( $id ) {
		return isset( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] ) ? get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] : '';
	}
}
