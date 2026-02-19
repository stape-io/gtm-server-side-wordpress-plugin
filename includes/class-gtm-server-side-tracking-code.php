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

		// phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.InlineComment.InvalidEndChar
		// add_action( 'login_head', array( $this, 'head' ) );
		add_action( 'wp_head', array( $this, 'head' ) );
	}

	/**
	 * Add GTM Head.
	 *
	 * @return void
	 */
	public function head() {
		if (
			GTM_Server_Side_Helpers::has_gtm_custom_loader_from_api() &&
			GTM_SERVER_SIDE_FIELD_VALUE_YES === GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_GTM_CUSTOM_LOADER_FROM_API_ALLOWED )
		) {

			$this->print_gtm_custom_loader_from_api();
			return;
		}

		if ( GTM_Server_Side_Helpers::is_enable_cookie_keeper() ) {

			$this->print_cookie_keeper_gtm_code();
			return;
		}

		if ( GTM_Server_Side_Helpers::has_gtm_container_identifier() ) {

			$this->print_stape_gtm_code();
			return;
		}

		$this->print_default_gtm_code();
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
		        '" . esc_js( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '/' . esc_js( GTM_Server_Side_Helpers::get_gtm_container_identifier() ) . ".js?id='+i+dl;f.parentNode.insertBefore(j,f);
		    })(window,document,'script','dataLayer','" . esc_js( GTM_Server_Side_Helpers::get_gtm_container_id() ) . "');</script>
		<!-- End Google Tag Manager -->
		";
	}

	/**
	 * Print stape GTM Code.
	 *
	 * @return void
	 */
	private function print_stape_gtm_code() {
		echo "
		<!-- Google Tag Manager -->
		<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src=\"" . esc_js( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '/' . esc_js( GTM_Server_Side_Helpers::get_gtm_container_identifier() ) . ".js?\"+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" . esc_js( GTM_Server_Side_Helpers::get_gtm_container_id() ) . "');</script>
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
		<!-- Google Tag Manager -->
		<script>!function(){"use strict";function l(e){for(var t=e,r=0,n=document.cookie.split(";");r<n.length;r++){var o=n[r].split("=");if(o[0].trim()===t)return o[1]}}function s(e){return localStorage.getItem(e)}function u(e){return window[e]}function A(e,t){e=document.querySelector(e);return t?null==e?void 0:e.getAttribute(t):null==e?void 0:e.textContent}var e=window,t=document,r="script",n="dataLayer",o="' . esc_js( GTM_Server_Side_Helpers::get_gtm_container_url() ) . '",a="",i="' . esc_js( GTM_Server_Side_Helpers::get_gtm_container_identifier() ) . '",c="' . esc_js( GTM_Server_Side_Helpers::get_gtm_container_id() ) . '",g="cookie",v="_sbp",E="",d=!1;try{var d=!!g&&(m=navigator.userAgent,!!(m=new RegExp("Version/([0-9._]+)(.*Mobile)?.*Safari.*").exec(m)))&&16.4<=parseFloat(m[1]),f="stapeUserId"===g,I=d&&!f?function(e,t,r){void 0===t&&(t="");var n={cookie:l,localStorage:s,jsVariable:u,cssSelector:A},t=Array.isArray(t)?t:[t];if(e&&n[e])for(var o=n[e],a=0,i=t;a<i.length;a++){var c=i[a],c=r?o(c,r):o(c);if(c)return c}else console.warn("invalid uid source",e)}(g,v,E):void 0;d=d&&(!!I||f)}catch(e){console.error(e)}var m=e,g=(m[n]=m[n]||[],m[n].push({"gtm.start":(new Date).getTime(),event:"gtm.js"}),t.getElementsByTagName(r)[0]),v=I?"&bi="+encodeURIComponent(I):"",E=t.createElement(r),f=(d&&(i=8<i.length?i.replace(/([a-z]{8}$)/,"kp$1"):"kp"+i),!d&&a?a:o);E.async=!0,E.src=f+"/"+i+".js?"+c+v,null!=(e=g.parentNode)&&e.insertBefore(E,g)}();</script>
		<!-- End Google Tag Manager -->
		';
	}

	/**
	 * Print GTM Code from api.
	 *
	 * @return void
	 */
	private function print_gtm_custom_loader_from_api() {
		echo GTM_Server_Side_Helpers::get_gtm_custom_loader_from_api(); /* phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped */
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
