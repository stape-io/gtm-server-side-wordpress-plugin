<?php
/**
 * Admin settings, tab: Data Layer.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Admin settings, tab: Data Layer.
 */
class GTM_Server_Side_Admin_Settings_Data_Layer {
	/**
	 * Tab.
	 *
	 * @return void
	 */
	public static function tab() {
		add_settings_section(
			GTM_SERVER_SIDE_ADMIN_GROUP_DATA_LAYER,
			__( 'Data Layer', 'gtm-server-side' ),
			null,
			GTM_SERVER_SIDE_ADMIN_SLUG
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_DATA_LAYER_ECOMMERCE,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_DATA_LAYER_ECOMMERCE,
			__( 'Add ecommerce Data Layer events', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_DATA_LAYER_ECOMMERCE ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_DATA_LAYER_ECOMMERCE ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_DATA_LAYER_ECOMMERCE ), 'yes', false ) . '
					value="yes">';
				echo '<br>';
				esc_html_e( 'This option only works with Woocommerce shops. Adds basic events and their data: Login, SignUp, ViewItem, AddToCart, BeginCheckout, Purchase.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_DATA_LAYER
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_DATA_LAYER_USER_DATA,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_DATA_LAYER_USER_DATA,
			__( 'Add user data to Data Layer events', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_DATA_LAYER_USER_DATA ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_DATA_LAYER_USER_DATA ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_DATA_LAYER_USER_DATA ), 'yes', false ) . '
					value="yes">';
				echo '<br>';
				esc_html_e( 'All events for authorised users will have their personal details (name, surname, email, etc.) available. Their billing details will be available on the purchase event.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_DATA_LAYER
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME,
			__( 'Decorate dataLayer event name', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME ), GTM_SERVER_SIDE_FIELD_VALUE_YES, false ) . '
					value="yes">';
					echo '<br>';
					esc_html_e( 'We will append \'_stape\' to event names in your dataLayer to avoid potential conflicts and/or tag misfire with your existing events.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_DATA_LAYER
		);
	}
}
