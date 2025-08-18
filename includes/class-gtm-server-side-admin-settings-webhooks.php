<?php
/**
 * Admin settings, tab: Webhooks.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Admin settings, tab: Webhooks.
 */
class GTM_Server_Side_Admin_Settings_Webhooks {
    const TAB = 'webhooks';

	/**
	 * Tab.
	 *
	 * @return void
	 */
	public static function tab() {
		add_settings_section(
			GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS,
			__( 'Webhooks', 'gtm-server-side' ),
			null,
			GTM_SERVER_SIDE_ADMIN_SLUG
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_ENABLE,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_ENABLE,
			__( 'Send webhooks to server GTM container', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_ENABLE ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_ENABLE ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_ENABLE ), 'yes', false ) . '
					value="yes">';
				echo '<br>';
				printf( __( 'This option will allow webhooks to be sent to your server GTM container. <a href="%s" target="_blank">How to set this up?</a>', 'gtm-server-side' ), 'https://stape.io/blog/what-are-webhooks-and-their-use-in-server-side-tracking' ); // phpcs:ignore
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS
		);

		register_setting( GTM_SERVER_SIDE_ADMIN_GROUP, GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL );
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL,
			__( 'Server GTM container URL', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL ) . '"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL ) ) . '">';
				echo '<br>';
				printf( __( 'If you use <a href="%s" target="_blank">stape.io sGTM hosting</a> you can find sGTM container URL following <a href="%s" target="_blank">this guide</a>. Otherwise you can find sGTM container URL in the <a href="%s" target="_blank">container settings</a>.', 'gtm-server-side' ), 'https://stape.io/gtm-server-hosting', 'https://help.stape.io/hc/en-us/articles/6080905799453-Find-server-container-URL-for-sGTM-container', 'https://developers.google.com/tag-platform/tag-manager/server-side/app-engine-setup#4_add_the_server_url_to_google_tag_manager' ); // phpcs:ignore
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE,
			__( 'Purchase webhook', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE ), 'yes', false ) . '
					value="yes">';
					echo '<br>';
					echo __( 'Purchase event will be sent whenever a new order is created.', 'gtm-server-side' ); // phpcs:ignore
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING,
			__( 'Order paid webhook - processing', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING ), 'yes', false ) . '
					value="yes">';
					echo '<br>';
					printf( __( 'order_paid event will be sent whenever an order is paid (has "Processing" status as per <a href="%s" target="_blank">Woocommerce documentation</a>).', 'gtm-server-side' ), 'https://woocommerce.com/document/managing-orders/order-statuses/' ); // phpcs:ignore
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_COMPLETED,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_COMPLETED,
			__( 'Order paid webhook - completed', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_COMPLETED ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_COMPLETED ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_COMPLETED ), 'yes', false ) . '
					value="yes">';
					echo '<br>';
					printf( __( 'order_completed event will be sent whenever order status becomes completed (has "Completed" status as per <a href="%s" target="_blank">Woocommerce documentation</a>).', 'gtm-server-side' ), 'https://woocommerce.com/document/managing-orders/order-statuses/' ); // phpcs:ignore
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND,
			__( 'Refund webhook', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND ), 'yes', false ) . '
					value="yes">';
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_WEBHOOKS
		);
	}
}
