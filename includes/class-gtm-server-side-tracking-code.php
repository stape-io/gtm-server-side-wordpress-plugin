<?php
/**
 * The public-facing functionality of the plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Tracking by code.
 */
class GTM_Server_Side_Tracking_Code {
	use GTM_Server_Side_Singleton;

	/**
	 * If no script tag is printed.
	 *
	 * @var bool
	 */
	public $printed_noscript_tag = false;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE !== GTM_Server_Side_Helpers::get_option_container_placement() ) {
			return;
		}

		add_action( 'login_head', array( $this, 'head' ) );
		add_action( 'login_header', array( $this, 'body' ) );
		add_action( 'login_footer', array( $this, 'body' ) );

		add_action( 'wp_head', array( $this, 'head' ) );
		add_action( 'body_open', array( $this, 'body' ) );
		add_action( 'wp_body_open', array( $this, 'body' ) );
		add_action( 'genesis_before', array( $this, 'body' ) );
		add_action( 'tha_body_top', array( $this, 'body' ) );
		add_action( 'body_top', array( $this, 'body' ) );
		add_action( 'wp_footer', array( $this, 'body' ) );
	}

	/**
	 * Add GTM Head.
	 *
	 * @return void
	 */
	public function head() {
		echo "
		<!-- Google Tag Manager -->
		<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
		            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
		        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
		        '" . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '/' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_identifier() ) . ".js?id='+i+dl;f.parentNode.insertBefore(j,f);
		    })(window,document,'script','dataLayer','" . esc_js( GTM_Server_Side_Helpers::get_gtm_container_id() ) . "');</script>
		<!-- End Google Tag Manager -->
		";
	}

	/**
	 * Add GTM body
	 *
	 * @return void
	 */
	public function body() {
		// Make sure we only print the noscript tag once.
		// This is because we're trying for multiple hooks.
		if ( $this->printed_noscript_tag ) {
			return;
		}
		$this->printed_noscript_tag = true;

		echo '
		<!-- Google Tag Manager (noscript) -->
		<noscript><iframe src="' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '/ns.html?id=' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_id() ) . '"
		                  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
		<!-- End Google Tag Manager (noscript) -->
		';
	}
}
