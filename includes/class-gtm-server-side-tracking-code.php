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
	private $printed_noscript_tag = false;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( GTM_SERVER_SIDE_FIELD_PLACEMENT_VALUE_CODE !== GTM_Server_Side_Helpers::get_option_container_placement() ) {
			return;
		}

		$this->add_cookie_keeper();

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
		if ( GTM_Server_Side_Helpers::is_enable_cookie_keeper() ) {
			$this->print_cookie_keeper_gtm_code();
		} else {
			$this->print_default_gtm_code();
		}
	}

	/**
	 * Add GTM body
	 *
	 * @return void
	 */
	public function body() {
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

	/**
	 * Print default GTM Code.
	 *
	 * @return void
	 */
	private function print_default_gtm_code() {
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
	 * Print cookie keeper GTM Code.
	 *
	 * @return void
	 */
	private function print_cookie_keeper_gtm_code() {
		echo '
		<!-- GTM Container Loader By GTM Server Side plugin -->
		<script>!function(){"use strict";function e(e,t,o){return void 0===t&&(t=""),"cookie"===e?function(e){for(var t=0,o=document.cookie.split(";");t<o.length;t++){var r=o[t].split("=");if(r[0].trim()===e)return r[1]}}(t):"localStorage"===e?(r=t,localStorage.getItem(r)):"jsVariable"===e?window[t]:"cssSelector"===e?(n=t,i=o,a=document.querySelector(n),i?null==a?void 0:a.getAttribute(i):null==a?void 0:a.textContent):void console.warn("invalid uid source",e);var r,n,i,a}!function(t,o,r,n,i,a,c,l,s,u){var d,v,E,I;try{v=l&&(E=navigator.userAgent,(I=/Version\/([0-9\._]+)(.*Mobile)?.*Safari.*/.exec(E))&&parseFloat(I[1])>=16.4)?e(l,"_sbp",""):void 0}catch(e){console.error(e)}var g=t;g[n]=g[n]||[],g[n].push({"gtm.start":(new Date).getTime(),event:"gtm.js"});var m=o.getElementsByTagName(r)[0],T=v?"&bi="+encodeURIComponent(v):"",_=o.createElement(r),f=v?"kp"+c:c;_.async=!0,_.src="' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '/"+f+".js?id=' . esc_js( GTM_Server_Side_Helpers::get_gtm_container_id() ) . '"+T,null===(d=m.parentNode)||void 0===d||d.insertBefore(_,m)}(window,document,"script","dataLayer",0,0,"' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_identifier() ) . '","cookie")}();</script>
		<!-- END of GTM Container Loader By GTM Server Side plugin -->		
		';
	}

	/**
	 * Add cookie keeper.
	 *
	 * @return void
	 */
	private function add_cookie_keeper() {
		if ( ! GTM_Server_Side_Helpers::is_enable_cookie_keeper() ) {
			if ( ! empty( $_COOKIE[ GTM_SERVER_SIDE_COOKIE_KEEPER_NAME ] ) ) {
				GTM_Server_Side_Helpers::delete_cookie( GTM_SERVER_SIDE_COOKIE_KEEPER_NAME );
			}
			return;
		}

		if ( ! empty( $_COOKIE[ GTM_SERVER_SIDE_COOKIE_KEEPER_NAME ] ) ) {
			return;
		}

		GTM_Server_Side_Helpers::set_cookie(
			array(
				'name'    => GTM_SERVER_SIDE_COOKIE_KEEPER_NAME,
				'value'   => md5( wp_rand( PHP_INT_MIN, PHP_INT_MAX ) . '|' . filter_input( INPUT_SERVER, 'HTTP_USER_AGENT', FILTER_DEFAULT ) . '|' . time() ),
				'expires' => time() + ( YEAR_IN_SECONDS * 2 ),
			)
		);
	}
}
