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
		<noscript><iframe src="' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '/ns.html?id=' . esc_attr( GTM_Server_Side_Helpers::get_gtm_filtering_container_id() ) . '"
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
		        '" . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '/' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_identifier() ) . '.js?' . esc_attr( GTM_Server_Side_Helpers::get_gtm_param_id() ) . "='+i+dl;f.parentNode.insertBefore(j,f);
		    })(window,document,'script','dataLayer','" . esc_js( GTM_Server_Side_Helpers::get_gtm_filtering_container_id() ) . "');</script>
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
		<script>!function(){"use strict";function l(e){for(var t=e,r=0,n=document.cookie.split(";");r<n.length;r++){var o=n[r].split("=");if(o[0].trim()===t)return o[1]}}function s(e){return localStorage.getItem(e)}function u(e){return window[e]}function d(e,t){e=document.querySelector(e);return t?null==e?void 0:e.getAttribute(t):null==e?void 0:e.textContent}var e=window,t=document,r="script",n="dataLayer",o="' . esc_js( GTM_Server_Side_Helpers::get_gtm_filtering_container_id() ) . '",a="' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '",i="",c="' . esc_attr( GTM_Server_Side_Helpers::get_gtm_container_identifier() ) . '",E="cookie",I="_sbp",v="",g=!1;try{var g=!!E&&(m=navigator.userAgent,!!(m=new RegExp("Version/([0-9._]+)(.*Mobile)?.*Safari.*").exec(m)))&&16.4<=parseFloat(m[1]),A="stapeUserId"===E,f=g&&!A?function(e,t,r){void 0===t&&(t="");var n={cookie:l,localStorage:s,jsVariable:u,cssSelector:d},t=Array.isArray(t)?t:[t];if(e&&n[e])for(var o=n[e],a=0,i=t;a<i.length;a++){var c=i[a],c=r?o(c,r):o(c);if(c)return c}else console.warn("invalid uid source",e)}(E,I,v):void 0;g=g&&(!!f||A)}catch(e){console.error(e)}var m=e,E=(m[n]=m[n]||[],m[n].push({"gtm.start":(new Date).getTime(),event:"gtm.js"}),t.getElementsByTagName(r)[0]),I="dataLayer"===n?"":"&l="+n,v=f?"&bi="+encodeURIComponent(f):"",A=t.createElement(r),e=g?"kp"+c:c,n=!g&&i?i:a;A.async=!0,A.src=n+"/"+e+".js?st="+o+I+v,null!=(f=E.parentNode)&&f.insertBefore(A,E)}();</script>
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
