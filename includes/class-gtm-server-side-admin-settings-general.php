<?php
/**
 * Admin settings, tab: General.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Admin settings, tab: General.
 */
class GTM_Server_Side_Admin_Settings_General {
	/**
	 * Tab.
	 *
	 * @return void
	 */
	public static function tab() {

		$placement = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_PLACEMENT );
		add_settings_section(
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			__( 'General', 'gtm-server-side' ),
			function() use ( $placement ) {
				if ( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN === $placement ) {
					echo '<input
						type="hidden"
						id="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN ) . '"
						name="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT ) . '"
						value="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN ) . '">';
				}

				self::render_same_origin_card();
			},
			GTM_SERVER_SIDE_ADMIN_SLUG
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_PLACEMENT,
			array(
				'sanitize_callback' => function( $value ) {
					$allows = array(
						GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE,
						GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN,
						GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE,
						GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_GTM_CONSENT,
					);
					return in_array( $value, $allows, true ) ? $value : GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE;
				},
			)
		);

		$field_placement    = GTM_SERVER_SIDE_FIELD_PLACEMENT . '-tmp';
		$allowed_placements = array(
			GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE,
			GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE,
			GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_GTM_CONSENT,
		);
		if ( in_array( $placement, $allowed_placements, true ) ) {
			$field_placement = GTM_SERVER_SIDE_FIELD_PLACEMENT;
		}

		add_settings_field(
			GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE,
			__( 'Add web GTM script onto every page of your website', 'gtm-server-side' ),
			function() use ( $placement, $field_placement ) {
				echo '<input
					type="radio"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE ) . '"
					class="js-' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT ) . '"
					name="' . esc_attr( $field_placement ) . '"
					' . checked( $placement, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE, false ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE ) . '">';
				esc_html_e( 'Select this option if you want to embed the web GTM snippet code onto every page of your website.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
		);
		/* phpcs:ignore Squiz.Commenting.BlockComment.NoCapital *
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN,
			__( 'Update existing web GTM script', 'gtm-server-side' ),
			function() use ( $placement ) {
				echo '<input
					type="radio"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN ) . '"
					class="js-' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT ) . '"
					' . checked( $placement, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN, false ) . '
					' . ( GTM_Server_Side_Helpers::is_plugin_gtm4wp_enabled() ? '' : 'disabled' ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_PLUGIN ) . '">';
				esc_html_e( 'Use this option if you require or have already inserted the web GTM container code manually or through another plugin. In this case GTM Server Side plugin will not add web GTM code onto your website, it will only modify the existing GTM code. This selection becomes available only if the web GTM script has been successfully found on your website.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
		);
		/**/
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_GTM_CONSENT,
			__( 'Load GTM with consent', 'gtm-server-side' ),
			function() use ( $placement, $field_placement ) {
				echo '<input
					type="radio"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_GTM_CONSENT ) . '"
					class="js-' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT ) . '"
					name="' . esc_attr( $field_placement ) . '"
					' . checked( $placement, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_GTM_CONSENT, false ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_GTM_CONSENT ) . '">';
					esc_html_e( 'Select this option if you want GTM not to execute until the visitor consent management platform (CMP) grants ad_storage or analytics_storage consent.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_ROLES,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_LIST_ROLES,
			array(
				'sanitize_callback' => function( $value ) {
					if ( ! is_array( $value ) ) {
						return array();
					}
					return array_map( 'sanitize_key', $value );
				},
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_ROLES,
			__( 'Exclude GTM for user roles', 'gtm-server-side' ),
			function() {
				echo '<div class="gtm-server-side-gtm-exclude-roles">';
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_ROLES ) . '"
					class="js-' . esc_attr( GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_ROLES ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_ROLES ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_ROLES ), GTM_SERVER_SIDE_FIELD_VALUE_YES, false ) . '
					value="yes">';
					esc_html_e( 'Select this option to prevent GTM from loading for specific logged-in user roles.', 'gtm-server-side' );

				if ( function_exists( 'wp_roles' ) ) {
					$roles         = wp_roles()->roles;
					$exclude_roles = GTM_Server_Side_Helpers::get_gtm_exclude_list_roles();

					echo '<div class="js-gtm-server-side-gtm-exclude-roles-block">';
					foreach ( $roles as $role_key => $role ) {
						echo '<br><label><input
							type="checkbox"
							class="js-' . esc_attr( GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_LIST_ROLES ) . '"
							name="' . esc_attr( GTM_SERVER_SIDE_FIELD_GTM_EXCLUDE_LIST_ROLES ) . '[]"
							' . checked( in_array( $role_key, $exclude_roles, true ), true, false ) . '
							value="' . esc_attr( $role_key ) . '"
						> ' . esc_html( $role['name'] ) . '</label>';
					}
					echo '</div>';
				}
				echo '<span class="js-gtm-server-side-gtm-exclude-roles-message"></span>';
				echo '</div>';
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
		);

		add_settings_field(
			GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE,
			__( 'Disable', 'gtm-server-side' ),
			function() use ( $placement, $field_placement ) {
				echo '<input
					type="radio"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT . '-' . GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE ) . '"
					class="js-' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT ) . '"
					name="' . esc_attr( $field_placement ) . '"
					' . checked( $placement, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE, false ) . '
					value="' . esc_attr( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE ) . '">';
					esc_html_e( 'Use this option if you do not want to insert web GTM snippet code onto your website.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
		);

		register_setting( GTM_SERVER_SIDE_ADMIN_GROUP, GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID );
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID,
			__( 'Web Google Tag Manager ID', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID ) . '"
					pattern="GTM-.*"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_ID ) ) . '">';
				echo '<br>';
				esc_html_e( 'Enter the WEB Google Tag Manager ID, should be formatted as "GTM-XXXXXX".', 'gtm-server-side' ); //phpcs:ignore WordPress.Security.EscapeOutput.UnsafePrintingFunction
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_ENABLE,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);

		register_setting( GTM_SERVER_SIDE_ADMIN_GROUP, GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL );
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL,
			__( 'Server GTM container URL', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					pattern="https://.*"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL ) . '"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEB_CONTAINER_URL ) ) . '">';
				echo '<br>';
				printf(
					__( 'If you use <a href="%s" target="_blank">stape.io sGTM hosting</a> you can find sGTM container URL following <a href="%s" target="_blank">this guide</a>. Otherwise you can find sGTM container URL in the <a href="%s" target="_blank">container settings</a>.', 'gtm-server-side' ), // phpcs:ignore
					'https://stape.io/gtm-server-hosting',
					'https://help.stape.io/hc/en-us/articles/6080905799453-Find-server-container-URL-for-sGTM-container',
					'https://developers.google.com/tag-platform/tag-manager/server-side/app-engine-setup#4_add_the_server_url_to_google_tag_manager'
				);
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array( 'class' => 'js-gtm-server-side-alternative-scenario' )
		);

		register_setting( GTM_SERVER_SIDE_ADMIN_GROUP, GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER );
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER,
			__( 'Stape container identifier', 'gtm-server-side' ),
			function() {
				echo '<input
					type="text"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER ) . '"
					class="js-' . esc_attr( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER ) . '"
					value="' . esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEB_IDENTIFIER ) ) . '">';
				echo '<br>';
				printf(
					__( 'Follow <a href="%s" target="_blank">this guide</a> to find stape container identifier. Stape container identifier is used to activate <a href="%s" target="_blank">custom loader</a> for your web Google Tag Manager script. Custom loader helps to improve the <a href="%s" target="_blank">accuracy of conversion tracking</a>. This feature is available only if you use <a href="%s" target="_blank">stape.io sGTM hosting</a> and enabled <a href="%s" target="_blank">Custom Loader power up</a>.','gtm-server-side' ), //phpcs:ignore
					'https://help.stape.io/hc/en-us/articles/9697466601373-How-to-find-the-Stape-container-identifier',
					'https://stape.io/solutions/custom-gtm-loader',
					'https://stape.io/blog/avoiding-google-tag-manager-blocking-by-adblockers',
					'https://stape.io/gtm-server-hosting',
					'https://help.stape.io/hc/en-us/articles/6080917962397-Set-up-custom-web-GTM-loader',
				);
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array( 'class' => 'js-gtm-server-side-alternative-scenario' )
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_PATH,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_same_origin_path',
			)
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_API_KEY,
			array(
				'sanitize_callback' => 'sanitize_text_field',
			)
		);

		register_setting(
			GTM_SERVER_SIDE_ADMIN_GROUP,
			GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER,
			array(
				'sanitize_callback' => 'GTM_Server_Side_Helpers::sanitize_bool',
			)
		);
		add_settings_field(
			GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER,
			__( 'Cookie Keeper', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER ), GTM_SERVER_SIDE_FIELD_VALUE_YES, false ) . '
					value="yes">';
				echo '<br>';
				printf(
					__( 'Cookie Keeper is used to <a href="%s" target="_blank">prolong cookie lifetime</a> in Safari and other browsers with ITP. This option available only if you use <a href="%s" target="_blank">stape.io sGTM hosting</a> and set up <a href="%s" target="_blank">Cookie Keeper power up</a>.', 'gtm-server-side' ), //phpcs:ignore
					'https://stape.io/blog/increase-first-party-cookie-lifetime-set-by-a-third-party-ip',
					'https://stape.io/gtm-server-hosting',
					'https://stape.io/blog/increase-first-party-cookie-lifetime-set-by-a-third-party-ip#how-cookie-keeper-works'
				);
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL,
			array( 'class' => 'js-gtm-server-side-alternative-scenario' )
		);
	}

	/**
	 * Render the same-origin proxy card shown at the top of the General tab.
	 *
	 * @return void
	 */
	public static function render_same_origin_card() {
		$toggle_id = GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_ENABLE;
		?>
		<div class="gtm-so-card">
			<table class="form-table gtm-so-card-table" role="presentation">
				<tbody>
					<tr class="gtm-so-toggle-row">
						<th scope="row">
							<?php esc_html_e( 'Same-origin proxy', 'gtm-server-side' ); ?>
							<span class="gtm-so-beta"><?php esc_html_e( 'Beta', 'gtm-server-side' ); ?></span>
						</th>
						<td>
							<span class="gtm-so-toggle-wrap">
								<input
									type="checkbox"
									class="gtm-so-input"
									id="<?php echo esc_attr( $toggle_id ); ?>"
									name="<?php echo esc_attr( $toggle_id ); ?>"
									<?php checked( GTM_Server_Side_Helpers::get_option( $toggle_id ), GTM_SERVER_SIDE_FIELD_VALUE_YES ); ?>
									value="yes">
								<label class="gtm-so-switch" for="<?php echo esc_attr( $toggle_id ); ?>"><span class="gtm-so-slider"></span></label>
								<span class="gtm-so-state"></span>
							</span>
							<p class="gtm-so-desc">
								<?php
								echo wp_kses(
									__( 'The GTM loader is served from Stape through <strong>your own WordPress server</strong>, so it loads first-party. The proxying runs on infrastructure you control, and its load scales with your traffic.', 'gtm-server-side' ),
									array( 'strong' => array() )
								);
								?>
							</p>
						</td>
					</tr>
					<tr class="gtm-so-webid-anchor" style="display:none"><td></td></tr>
					<tr class="gtm-server-side-same-origin-field">
						<th scope="row"><?php esc_html_e( 'Proxy path', 'gtm-server-side' ); ?></th>
						<td>
							<input
								type="text"
								id="<?php echo esc_attr( GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_PATH ); ?>"
								name="<?php echo esc_attr( GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_PATH ); ?>"
								pattern="/.+"
								value="<?php echo esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_PATH ) ); ?>">
							<button type="button" class="button js-gtm-server-side-test-same-origin" disabled><?php esc_html_e( 'Test connection', 'gtm-server-side' ); ?></button>
							<span class="js-gtm-server-side-same-origin-message"></span>
							<br>
							<?php esc_html_e( 'The path on this domain that requests are proxied through. Must start with a slash. Save settings before testing.', 'gtm-server-side' ); ?>
						</td>
					</tr>
					<tr class="gtm-server-side-same-origin-field">
						<th scope="row"><?php esc_html_e( 'Container API key', 'gtm-server-side' ); ?></th>
						<td>
							<input
								type="text"
								id="<?php echo esc_attr( GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_API_KEY ); ?>"
								name="<?php echo esc_attr( GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_API_KEY ); ?>"
								value="<?php echo esc_attr( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_SAME_ORIGIN_API_KEY ) ); ?>">
							<br>
							<?php
							echo wp_kses(
								__( 'Paste your container API key, found under <a href="https://app.stape.io" target="_blank">Stape container settings</a> — <strong>not the container identifier</strong>.', 'gtm-server-side' ),
								array(
									'a'      => array(
										'href'   => array(),
										'target' => array(),
									),
									'strong' => array(),
								)
							);
							?>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<?php
	}
}
