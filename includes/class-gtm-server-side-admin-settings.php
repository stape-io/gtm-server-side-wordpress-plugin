<?php
/**
 * The admin-specific functionality of the plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * The admin-specific functionality of the plugin.
 */
class GTM_Server_Side_Admin_Settings {
	use GTM_Server_Side_Singleton;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		add_action( 'admin_init', array( $this, 'admin_init' ) );
		add_action( 'admin_menu', array( $this, 'admin_menu' ) );
		add_filter( 'plugin_action_links', array( $this, 'plugin_action_links' ), 10, 2 );
	}

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function admin_init() {

		switch ( self::get_settings_tab() ) :
			case 'data-layer':
				$this->settings_tab_data_layer();
				break;
			case 'webhooks':
				$this->settings_tab_webhooks();
				break;
			case 'general':
			default:
				$this->settings_tab_general();
				break;
		endswitch;
	}

	/**
	 * Settings tab general.
	 *
	 * @return void
	 */
	public function settings_tab_general() {

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
					);
					return in_array( $value, $allows, true ) ? $value : GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE;
				},
			)
		);

		$field_placement = GTM_SERVER_SIDE_FIELD_PLACEMENT . '-tmp';
		if ( in_array( $placement, array( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE, GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_DISABLE ), true ) ) {
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
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
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
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
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
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_COOKIE_KEEPER ), 'yes', false ) . '
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
			GTM_SERVER_SIDE_ADMIN_GROUP_GENERAL
		);
	}

	/**
	 * Settings tab data layer.
	 *
	 * @return void
	 */
	public function settings_tab_data_layer() {
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
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_DATA_LAYER_CUSTOM_EVENT_NAME ), 'yes', false ) . '
					value="yes">';
					echo '<br>';
					esc_html_e( 'We will append \'_stape\' to event names in your dataLayer to avoid potential conflicts and/or tag misfire with your existing events.', 'gtm-server-side' );
			},
			GTM_SERVER_SIDE_ADMIN_SLUG,
			GTM_SERVER_SIDE_ADMIN_GROUP_DATA_LAYER
		);
	}

	/**
	 * Settings tab webhooks
	 *
	 * @return void
	 */
	public function settings_tab_webhooks() {
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
			__( 'Order paid webhook', 'gtm-server-side' ),
			function() {
				echo '<input
					type="checkbox"
					id="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING ) . '"
					name="' . esc_attr( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING ) . '"
					' . checked( GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING ), 'yes', false ) . '
					value="yes">';
					echo '<br>';
					printf( __( 'Order paid event will be sent whenever an order is paid (has "Processing" status as per <a href="%s" target="_blank">Woocommerce documentation</a>).', 'gtm-server-side' ), 'https://woocommerce.com/document/managing-orders/order-statuses/' ); // phpcs:ignore
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

	/**
	 * Add settings menu.
	 *
	 * @since    1.0.0
	 */
	public function admin_menu() {
		add_options_page(
			__( 'GTM Server Side', 'gtm-server-side' ),
			__( 'GTM Server Side', 'gtm-server-side' ),
			'manage_options',
			GTM_SERVER_SIDE_ADMIN_SLUG,
			function() {
				wp_enqueue_style( 'gtm-server-side-admin' );
				wp_enqueue_script( 'gtm-server-side-admin' );

				load_template( GTM_SERVER_SIDE_PATH . 'templates/class-gtm-server-side-admin.php', false );
			},
			27
		);
	}

	/**
	 * Add plugin links.
	 *
	 * @param array  $links Links.
	 * @param string $file File.
	 *
	 * @return mixed
	 */
	public function plugin_action_links( $links, $file ) {
		if ( strpos( $file, '/gtm-server-side.php' ) === false ) {
			return $links;
		}

		$settings_link = '<a href="' . menu_page_url( GTM_SERVER_SIDE_ADMIN_SLUG, false ) . '">' . esc_html( __( 'Settings' ) ) . '</a>';

		array_unshift( $links, $settings_link );

		return $links;
	}

	/**
	 * Return settings tab.
	 *
	 * @return string
	 */
	public static function get_settings_tab() {
		$tab = filter_input( INPUT_GET, 'tab', FILTER_DEFAULT );
		if ( ! empty( $tab ) ) {
			return $tab;
		}
		$tab = filter_input( INPUT_POST, 'tab', FILTER_DEFAULT );
		if ( ! empty( $tab ) ) {
			return $tab;
		}
		return 'general';
	}
}
