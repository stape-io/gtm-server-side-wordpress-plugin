<?php

/**
 * @package    Google_Tag_Manager_Server_Side
 * @subpackage Google_Tag_Manager_Server_Side/public
 */
class Google_Tag_Manager_Server_Side_Public {

	public static $printed_noscript_tag = false;

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $google_tag_manager_server_side    The ID of this plugin.
	 */
	private $google_tag_manager_server_side;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $google_tag_manager_server_side       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $google_tag_manager_server_side, $version ) {

		$this->google_tag_manager_server_side = $google_tag_manager_server_side;
		$this->version = $version;

	}

	public function gtm_head() {
		if (get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ] !== GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE) {
			return;
		}

		echo "
		<!-- Google Tag Manager -->
		<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
		            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
		        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
		        '".esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_SERVER_CONTAINER_URL ] )."/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
		    })(window,document,'script','dataLayer','".esc_js( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_ID ] )."');</script>
		<!-- End Google Tag Manager -->
		";
	}

	public function gtm_body() {
		// Make sure we only print the noscript tag once.
		// This is because we're trying for multiple hooks.
		if ( self::$printed_noscript_tag ) {
			return;
		}
		self::$printed_noscript_tag = true;

		if (get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ] !== GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE) {
			return;
		}

		echo '
		<!-- Google Tag Manager (noscript) -->
		<noscript><iframe src="https://www.googletagmanager.com/ns.html?id='.esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_ID ] ).'"
		                  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
		<!-- End Google Tag Manager (noscript) -->
		';
	}
}
