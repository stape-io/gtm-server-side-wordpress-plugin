<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/admin
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
			__( 'General', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			array( $this, 'admin_output_section' ),
			GTM_SERVER_SIDE_ADMIN_SLUG
		);

		add_settings_field(
			GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT,
			__( 'Web container code placement type', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT,
				'description' => __( 'Choose wisely.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_SERVER_CONTAINER_URL,
			__( 'GTM Server Side url', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_SERVER_CONTAINER_URL,
				'description' => __( 'Enter your Google Tag Manager server side url. For example: https://gtm.example.com', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_WEB_CONTAINER_ID,
			__( 'Google Tag Manager ID', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_WEB_CONTAINER_ID,
				'description' => __( 'Valid format: GTM-XXXXX where X can be numbers and capital letters.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_IDENTIFIER,
			__( 'Stape container identifier', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_IDENTIFIER,
				'description' => __( 'Use in case you configured <a href="https://stape.io/blog/avoiding-google-tag-manager-blocking-by-adblockers#how-to-avoid-google-tag-manager-blocking-by-ad-blockers" target="_blank">custom web GTM loader power-up</a>.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			)
		);

		add_settings_field(
			GTM_SERVER_SIDE_GA_ID,
			__( 'GA Property ID', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			array( $this, 'input_callback_function' ),
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array(
				'label_for'   => GTM_SERVER_SIDE_GA_ID,
				'description' => __( 'Valid format: UA-XXXXXXXXX-X. where X can be numbers. For example: UA-123456789-1.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ),
			)
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

			// echo  $data['description'].'<br>';
			echo '<input required class="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT . '" type="radio" id="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN . '" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" value="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN . '" ' . ( esc_attr( $this->getOption( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) ) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_PLUGIN ? 'checked="checked"' : '' ) . ' ' . ( $this->canPatchOtherPlugin() ? '' : 'disabled' ) . '/> ' . __( "Update existing GTM web container configuration for working with your server-side container. (This option is not enabled if we can't find an existing web container.)", GTM_SERVER_SIDE_TRANSLATION_DOMAIN ) . '<br />';
			echo '<input required class="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT . '" type="radio" id="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE . '" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" value="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE . '" ' . ( esc_attr( $this->getOption( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) ) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE ? 'checked="checked"' : '' ) . '/> ' . __( 'Add Google Tag Manager web container on all pages. If you have other GTM plugins, please disable them.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN ) . '<br />';
			echo '<input required class="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT . '" type="radio" id="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF . '" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" value="' . GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF . '" ' . ( esc_attr( $this->getOption( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ) ) === GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF ? 'checked="checked"' : '' ) . '/> ' . __( 'Off - only server-side events will be tracked. This increase page speed because no additional JS will be placed on the page, but only PageView and Woocommerce events will be tracked.', GTM_SERVER_SIDE_TRANSLATION_DOMAIN );

			return;
		}

		if ( $id === GTM_SERVER_SIDE_SERVER_CONTAINER_URL ) {

			echo '<input type="url" required pattern="https://.*" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( $this->getOption( $id ) ) . '"/><br />' . $data['description'];

			return;
		}

		if ( $id === GTM_SERVER_SIDE_IDENTIFIER ) {

			echo '<input type="text" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( $this->getOption( $id ) ) . '"/><br />' . $data['description'];

			return;
		}

		if ( $id === GTM_SERVER_SIDE_WEB_CONTAINER_ID ) {

			echo '<input type="text" pattern="GTM-.*" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( $this->getOption( $id ) ) . '"/><br />' . $data['description'];

			return;
		}

		if ( $id === GTM_SERVER_SIDE_GA_ID ) {

			echo '<input type="text" pattern="UA-.*-.*" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( $this->getOption( $id ) ) . '"/><br />' . $data['description'];

			return;
		}

		echo '<input type="text" name="' . GTM_SERVER_SIDE_ADMIN_OPTIONS . '[' . $id . ']" id="' . $id . '" value="' . esc_attr( $this->getOption( $id ) ) . '"/><br />' . $data['description'];
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
			array( $this, 'showOptionsPage' ),
			27
		);

	}

	/**
	 * Add admin page.
	 *
	 * @since    1.0.0
	 */
	public function showOptionsPage() {
		require_once 'partials/gtm-server-side-admin-display.php';
	}

	public function admin_output_section( $args ) {
		echo '<span class="tabinfo">';

		switch ( $args['id'] ) {
			case GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL:
			{
				_e( 'This plugin is intended to be used by IT girls&guys and marketing staff. If you don\'t know what to do follow our <a href="https://stape.io/how-to-add-google-analytics-and-facebook-pixels-to-wordpress-using-google-tag-manager-server-container/" target="_blank">step by step tutorial</a>.<br />', GTM_SERVER_SIDE_TRANSLATION_DOMAIN );

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
		if ( is_plugin_active( 'duracelltomi-google-tag-manager/duracelltomi-google-tag-manager-for-wordpress.php' ) ) {
			return true;
		}

		return false;
	}

	protected function getOption( $id ) {
		return isset( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] ) ? get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] : '';
	}
}
