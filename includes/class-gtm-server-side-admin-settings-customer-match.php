<?php
/**
 * Admin settings, tab: Customer Match.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Admin settings, tab: Customer Match.
 */
class GTM_Server_Side_Admin_Settings_Customer_Match {
	/**
	 * Tab.
	 *
	 * @return void
	 */
	public static function tab() {
		add_settings_section(
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH,
			__( 'Customer Match', 'gtm-server-side' ),
			null,
			GTM_SERVER_SIDE_ADMIN_SLUG
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONTAINER_API_KEY,
			array(
				'sanitize_callback' => 'sanitize_text_field',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONTAINER_API_KEY,
			__( 'Container API Key', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONTAINER_API_KEY ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONTAINER_API_KEY ) . '"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONTAINER_API_KEY ) ) . '">';
				echo '<br>';
				printf(
					__( 'Specify your Stape container API key. <a href="%s" target="_blank">How to find your container API key.</a>', 'gtm-server-side' ), // phpcs:ignore
					'https://stape.io/helpdesk/knowledgebase/how-to-find-stape-container-api-key',
				);
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_OPER_CUST_ID,
			array(
				'sanitize_callback' => 'sanitize_text_field',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_OPER_CUST_ID,
			__( 'Google Ads Operating customer ID', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_OPER_CUST_ID ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_OPER_CUST_ID ) . '"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_OPER_CUST_ID ) ) . '">';
				echo '<br>';
				printf(
					__( 'Destination account ID for Customer Match upload. <a href="%s" target="_blank">How to find Operating сustomer ID.</a>', 'gtm-server-side' ), // phpcs:ignore
					'https://stape.io/helpdesk/knowledgebase/how-to-find-customer-id-operating-customer-id#how-to-find-the-operating-customer-id',
				);
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_LOGIN_CUST_ID,
			array(
				'sanitize_callback' => 'sanitize_text_field',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_LOGIN_CUST_ID,
			__( 'Google Ads customer ID', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_LOGIN_CUST_ID ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_LOGIN_CUST_ID ) . '"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_LOGIN_CUST_ID ) ) . '">';
				echo '<br>';
				printf(
					__( 'Google Ads account ID used for authorization. <a href="%s" target="_blank">How to find customer ID.</a>', 'gtm-server-side' ), // phpcs:ignore
					'https://stape.io/helpdesk/knowledgebase/how-to-find-customer-id-operating-customer-id#how-to-find-the-customer-id',
				);
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH
		);

		/* phpcs:ignore
		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_AUDIENCE_ID,
			array(
				'sanitize_callback' => 'sanitize_text_field',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_AUDIENCE_ID,
			__( 'Audience ID', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_AUDIENCE_ID ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_AUDIENCE_ID ) . '"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_AUDIENCE_ID ) ) . '">';
				echo '<br>';
				printf(
					__( 'Specify target Google ADS Audience ID. <a href="%s" target="_blank">How to find Audience ID.</a>', 'gtm-server-side' ), // phpcs:ignore
					'https://stape.io/helpdesk',
				);
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH
		);
		*/

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_EMAIL,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_PHONE,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_ADDRESS,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			'gtm_server_side_field_cust_match_user_share',
			__( 'User data', 'gtm-server-side' ),
			function() {
				echo '<p>';
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_EMAIL ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_EMAIL ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_EMAIL ), GTM_SERVER_SIDE_FIELD_VALUE_YES, false ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_VALUE_YES ) . '">';
				esc_html_e( 'Share email', 'gtm-server-side' );
				echo '</p>';

				echo '<p>';
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_PHONE ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_PHONE ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_PHONE ), GTM_SERVER_SIDE_FIELD_VALUE_YES, false ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_VALUE_YES ) . '">';
				esc_html_e( 'Share phone', 'gtm-server-side' );
				echo '</p>';

				echo '<p>';
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_ADDRESS ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_ADDRESS ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_ADDRESS ), GTM_SERVER_SIDE_FIELD_VALUE_YES, false ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_VALUE_YES ) . '">';
				esc_html_e( 'Share address', 'gtm-server-side' );
				echo '</p>';
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONSENT,
			array(
				'sanitize_callback' => function( $value ) {
					$allows = array(
						GTM_SERVER_SIDE_FIELD_CONSENT_VALUE_STATUS_UNSPECIFIED,
						GTM_SERVER_SIDE_FIELD_CONSENT_VALUE_GRANTED,
						GTM_SERVER_SIDE_FIELD_CONSENT_VALUE_DENIED,
					);
					return in_array( $value, $allows, true ) ? $value : '';
				},
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONSENT,
			__( 'Consent', 'gtm-server-side' ),
			function() {
				$consent_value = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONSENT );
				$options       = array(
					GTM_SERVER_SIDE_FIELD_CONSENT_VALUE_STATUS_UNSPECIFIED,
					GTM_SERVER_SIDE_FIELD_CONSENT_VALUE_GRANTED,
					GTM_SERVER_SIDE_FIELD_CONSENT_VALUE_DENIED,
				);

				echo '<select
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONSENT ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONSENT ) . '">';
				echo '<option value=""></option>';
				foreach ( $options as $option ) {
					printf(
						'<option value="%s" %s>%s</option>',
						esc_attr( $option ),
						selected( $consent_value, $option, false ),
						esc_attr( $option )
					);
				}
				echo '</select>';
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH
		);

		$is_backfill_finished = GTM_SERVER_SIDE_FIELD_VALUE_YES === GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_CUST_MATCH_BACKFILL_FINISHED );

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL,
			__( 'Backfill', 'gtm-server-side' ),
			function() use ( $is_backfill_finished ) {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL ), GTM_SERVER_SIDE_FIELD_VALUE_YES, false ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_VALUE_YES ) . '">';
				echo '<br>';
				esc_html_e( 'Select to sync existing contacts using the settings above. Unselect to sync only new contacts that reach the configured statuses.', 'gtm-server-side' );

				if (
					GTM_SERVER_SIDE_FIELD_VALUE_YES === GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_BACKFILL ) &&
					! $is_backfill_finished
				) {
					echo '<div class="gtm-server-side-backfill-wrapper">';
					echo '<svg class="gtm-server-side-backfill-processing" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">';
					echo '<path d="M19 10C19 8.01761 18.3455 6.09069 17.1381 4.51842C15.9307 2.94615 14.238 1.81651 12.3227 1.30489C10.4075 0.793274 8.37693 0.928313 6.54632 1.68904C4.7157 2.44976 3.18747 3.79361 2.1989 5.51192C1.21033 7.23023 0.816749 9.22686 1.07926 11.1918C1.34177 13.1567 2.24568 14.98 3.65065 16.3785C5.05562 17.7771 6.88303 18.6726 8.84914 18.9261C10.8153 19.1796 12.8101 18.7769 14.5238 17.7804" stroke="#BBC3C9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
					echo '</svg>';

					echo '<div>';
					echo __( 'Sync in progress… This may take a few minutes. To stop backfill, <a href="#" class="js-gtm-server-side-backfill-btn-abort-backfill">click here</a>.', 'gtm-server-side' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
					echo '</div>';
					echo '</div>';
				}

				if ( $is_backfill_finished ) {
					echo '<div class="gtm-server-side-backfill-wrapper">';
					echo '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">';
					echo '<path d="M7 10.75L9.25 13L13 7.75M19 10C19 11.1819 18.7672 12.3522 18.3149 13.4442C17.8626 14.5361 17.1997 15.5282 16.364 16.364C15.5282 17.1997 14.5361 17.8626 13.4442 18.3149C12.3522 18.7672 11.1819 19 10 19C8.8181 19 7.64778 18.7672 6.55585 18.3149C5.46392 17.8626 4.47177 17.1997 3.63604 16.364C2.80031 15.5282 2.13738 14.5361 1.68508 13.4442C1.23279 12.3522 1 11.1819 1 10C1 7.61305 1.94821 5.32387 3.63604 3.63604C5.32387 1.94821 7.61305 1 10 1C12.3869 1 14.6761 1.94821 16.364 3.63604C18.0518 5.32387 19 7.61305 19 10Z" stroke="#29845A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
					echo '</svg>';
					esc_html_e( 'Great! Backfill is complete.', 'gtm-server-side' );
					echo '</div>';
				}

				echo '<div class="gtm-server-side-backfill-info">';
				echo __( 'A new Customer list named <b>stape_wp_purchasers</b> will be automatically created in your Google Ads audiences.', 'gtm-server-side' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				echo '</div>';
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_CUSTOMER_MATCH
		);
	}
}
