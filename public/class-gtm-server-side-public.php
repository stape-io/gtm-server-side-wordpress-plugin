<?php
/**
 * The public-facing functionality of the plugin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/public
 * @file       class-gtm-server-side-public.php
 */

/**
 * The public-facing functionality of the plugin.
 */
class GTM_Server_Side_Public {

	/**
	 * If no script tag is printed.
	 *
	 * @var bool
	 */
	public static $printed_noscript_tag = false;

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $gtm_server_side The ID of this plugin.
	 */
	private $gtm_server_side;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string $version The current version of this plugin.
	 */
	private $version;

	/**
	 * GA cid
	 *
	 * @var string
	 */
	private $cid;

	/**
	 * Array of tracking data.
	 *
	 * @var array
	 */
	private $tracking_data_array;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @param string $gtm_server_side The name of the plugin.
	 * @param string $version The version of this plugin.
	 *
	 * @since    1.0.0
	 */
	public function __construct( $gtm_server_side, $version ) {

		$this->gtm_server_side = $gtm_server_side;
		$this->version         = $version;

		$this->tracking_data_array = array();

	}

	/**
	 * GTM4WP filter init.
	 *
	 * @param string $domain The domain.
	 *
	 * @return string
	 */
	public function gtm4wp_filter( $domain ) {
		if ( strpos( $this->get_server_side_container_domain(), 'z.gtm-server.com' ) !== false ) {
			return $domain;
		}

		if ( strpos( $this->get_server_side_container_domain(), 'stape.io' ) !== false ) {
			return $domain;
		}

		return str_replace( 'www.googletagmanager.com/gtm', $this->get_server_side_container_domain() . '/' . $this->generate_gtm_js_file_url(), $domain );
	}

	/**
	 * Track cookies.
	 *
	 * @return void
	 */
	public function track_cookie_set() {
		if ( $this->is_backend_tracking() ) {
			return;
		}

		$expire_time_in_seconds = time() + 31104000;
		$domain                 = $this->get_cookie_domain();
		$cid                    = $this->get_cid();

		if ( PHP_VERSION_ID >= 70300 ) {
			setcookie(
				GTM_SERVER_SIDE_COOKIE_NAME,
				$cid,
				array(
					'expires'  => $expire_time_in_seconds,
					'path'     => '/',
					'domain'   => $domain,
					'samesite' => 'lax',
					'httponly' => true,
				)
			);
		} else {
			setcookie( GTM_SERVER_SIDE_COOKIE_NAME, $cid, $expire_time_in_seconds, '/; samesite=lax', $domain, false, true );
		}
	}

	/**
	 * Track add cart data.
	 *
	 * @return void
	 */
	public function track_add_cart_data() {
		$this->tracking_data_array['pa']  = 'checkout';
		$this->tracking_data_array['cos'] = 1;
	}

	/**
	 * Track add checkout data.
	 *
	 * @return void
	 */
	public function track_add_checkout_data() {
		$this->tracking_data_array['pa']  = 'checkout';
		$this->tracking_data_array['cos'] = 2;
	}

	/**
	 * Track add pdp view data.
	 *
	 * @return void
	 */
	public function track_add_pdp_view_data() {
		$this->tracking_data_array['pa'] = 'detail';
	}

	/**
	 * Track event add to cart.
	 *
	 * @return void
	 */
	public function track_event_add_to_cart() {
		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) : '';

		if ( 'GET' === $method ) {
			return;
		}

		if ( $this->is_backend_tracking() ) {
			return;
		}

		$tracking_data_array['pa'] = 'add';
		$tracking_data_array['t']  = 'event';
		$tracking_data_array['ec'] = 'Enhanced Ecommerce';
		$tracking_data_array['ea'] = 'Add to Cart';

		$this->send_event_to_ga( $tracking_data_array );
	}

	/**
	 * Track add order data.
	 *
	 * @param int $order_id The order id.
	 *
	 * @return void
	 */
	public function track_add_order_data( $order_id = null ) {
		if ( $this->is_backend_tracking() ) {
			return;
		}

		$tracking_data_array = $this->get_ee_data( $order_id );
		$this->send_event_to_ga( $tracking_data_array );
	}

	/**
	 * Track PageView.
	 *
	 * @return void
	 */
	public function track_pageview() {
		if ( $this->is_backend_tracking() ) {
			return;
		}

		$method = isset( $_SERVER['REQUEST_METHOD'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_METHOD'] ) ) : '';

		if ( 'POST' === $method || $this->is_url_blacklisted() ) {
			return;
		}

		$this->tracking_data_array['t'] = isset( $this->tracking_data_array['t'] ) ? $this->tracking_data_array['t'] : 'pageview';
		$this->send_event_to_ga( $this->tracking_data_array );
	}

	/**
	 * Add GTM Head.
	 *
	 * @return void
	 */
	public function gtm_head() {
		if ( $this->is_add_web_snippet() ) {
			return;
		}

		echo "
		<!-- Google Tag Manager -->
		<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
		            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
		        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
		        '" . esc_html( $this->generate_gtm_web_container_js_url() ) . '/' . esc_html( $this->generate_gtm_js_file_url() ) . ".js?id='+i+dl;f.parentNode.insertBefore(j,f);
		    })(window,document,'script','dataLayer','" . esc_js( $this->get_option( GTM_SERVER_SIDE_WEB_CONTAINER_ID ) ) . "');</script>
		<!-- End Google Tag Manager -->
		";
	}

	/**
	 * Add GTM body
	 *
	 * @return void
	 */
	public function gtm_body() {
		// Make sure we only print the noscript tag once.
		// This is because we're trying for multiple hooks.
		if ( self::$printed_noscript_tag ) {
			return;
		}
		self::$printed_noscript_tag = true;

		if ( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS ) && GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE !== get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ] ) {
			return;
		}

		echo '
		<!-- Google Tag Manager (noscript) -->
		<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=' . esc_attr( $this->get_option( GTM_SERVER_SIDE_WEB_CONTAINER_ID ) ) . '"
		                  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
		<!-- End Google Tag Manager (noscript) -->
		';
	}

	/**
	 * Generate GTM web container js url.
	 *
	 * @return string
	 */
	private function generate_gtm_web_container_js_url() {
		$transport_url = $this->get_option( GTM_SERVER_SIDE_SERVER_CONTAINER_URL );

		if ( strpos( $transport_url, '.gtm-server.com' ) !== false ) {
			return 'https://www.googletagmanager.com';
		}

		if ( strpos( $transport_url, '.stape.io' ) !== false ) {
			return 'https://www.googletagmanager.com';
		}

		return $transport_url;
	}

	/**
	 * Generate GTM js file url.
	 *
	 * @return string
	 */
	private function generate_gtm_js_file_url() {
		$identifier = $this->get_option( GTM_SERVER_SIDE_IDENTIFIER );

		if ( $identifier ) {
			return $identifier;
		}

		return 'gtm';
	}

	/**
	 * Is url blacklisted.
	 *
	 * @return bool
	 */
	private function is_url_blacklisted() {
		$blacklist = array(
			'ico',
			'gif',
			'png',
			'jpg',
			'jpeg',
			'svg',
			'js',
			'css',
			'scss',
			'xls',
			'xlsx',
			'csv',
			'json',
			'md',
			'txt',
			'pdf',
			'xml',
			'doc',
			'docx',
			'ppt',
			'pptx',
			'mp3',
			'wav',
		);

		$url = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';

		foreach ( $blacklist as $i_value ) {
			if ( preg_match( '/\.' . $i_value . '(\W|$)/', $url ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Send track request.
	 *
	 * @param string $url URL to send request to.
	 * @param string $user_agent_string User agent string.
	 *
	 * @return void
	 */
	private function send_track_request( $url, $user_agent_string ) {

		wp_remote_get(
			$url,
			array(
				'headers' => array(
					'cache-control' => 'no-cache',
					'User-Agent'    => $user_agent_string,
				),
			)
		);

	}

	/**
	 * Encode strings in array.
	 *
	 * @param mixed[] $arr_raw_strings Array of strings to encode.
	 *
	 * @return mixed
	 */
	private function encode_strings_in_array( $arr_raw_strings ) {

		$arr_encoded_strings = array();
		foreach ( $arr_raw_strings as $key => $raw_string ) {
			$arr_encoded_strings[ $key ] = mb_convert_encoding( $raw_string, 'UTF-8', mb_detect_encoding( $raw_string ) );
			$arr_encoded_strings[ $key ] = rawurlencode( $arr_encoded_strings[ $key ] );
		}

		return $arr_encoded_strings;
	}

	/**
	 * Get url.
	 *
	 * @return string
	 */
	private function get_url() {
		if ( isset( $_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI'] ) ) {
			return ( isset( $_SERVER['HTTPS'] ) ? 'https' : 'http' ) . '://' . sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) . sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) );
		}

		return '';
	}

	/**
	 * Get user agent.
	 *
	 * @return string
	 */
	private function get_user_agent() {
		$useragent = 'not_set';
		if ( isset( $_SERVER['HTTP_USER_AGENT'] ) ) {
			$useragent = sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) );
		}

		return $useragent;
	}

	/**
	 * Get IP.
	 *
	 * @return string
	 */
	private function get_ip() {
		$ipaddress = '0.0';
		$keys      = array(
			'HTTP_CLIENT_IP',
			'HTTP_X_FORWARDED_FOR',
			'HTTP_X_FORWARDED',
			'HTTP_FORWARDED_FOR',
			'HTTP_FORWARDED',
			'REMOTE_ADDR',
		);
		foreach ( $keys as $k ) {
			if ( isset( $_SERVER[ $k ] ) && ! empty( sanitize_text_field( wp_unslash( $_SERVER[ $k ] ) ) ) && filter_var( sanitize_text_field( wp_unslash( $_SERVER[ $k ] ) ), FILTER_VALIDATE_IP ) ) {
				$ipaddress = sanitize_text_field( wp_unslash( $_SERVER[ $k ] ) );
				break;
			}
		}

		return $ipaddress;
	}

	/**
	 * Get referrer.
	 *
	 * @return string
	 */
	public function get_referrer() {
		$ref = '';
		if ( isset( $_SERVER['HTTP_REFERER'] ) ) {
			$ref = esc_url_raw( wp_unslash( $_SERVER['HTTP_REFERER'] ) );
		}

		return $ref;
	}

	/**
	 * Get GA cid.
	 *
	 * @return string
	 */
	private function get_cid() {
		if ( $this->cid ) {
			return $this->cid;
		}

		if ( isset( $_COOKIE[ GTM_SERVER_SIDE_COOKIE_NAME ] ) && sanitize_text_field( wp_unslash( $_COOKIE[ GTM_SERVER_SIDE_COOKIE_NAME ] ) ) ) {
			$this->cid = sanitize_text_field( wp_unslash( $_COOKIE[ GTM_SERVER_SIDE_COOKIE_NAME ] ) );

			return $this->cid;
		}

		$this->cid = time() . '.' . wp_rand( 100000000, 900000000 );

		return $this->cid;
	}

	/**
	 * Get cookie domain.
	 *
	 * @return string
	 */
	private function get_cookie_domain() {
		return wp_parse_url( home_url() )['host'];
	}

	/**
	 * Get server side container url.
	 *
	 * @return string
	 */
	private function get_server_side_container_url() {
		return esc_attr( $this->get_option( GTM_SERVER_SIDE_SERVER_CONTAINER_URL ) );
	}

	/**
	 * Get server side container domain.
	 *
	 * @return string
	 */
	private function get_server_side_container_domain() {
		return str_replace( 'https://', '', $this->get_server_side_container_url() );
	}

	/**
	 * Send event to GA.
	 *
	 * @param array $tracking_data_array Tracking data array.
	 */
	private function send_event_to_ga( array $tracking_data_array ) {
		$tracking_data_array['tid'] = $this->get_option( GTM_SERVER_SIDE_GA_ID );
		$tracking_data_array['dl']  = $this->get_url();
		$tracking_data_array['ua']  = $this->get_user_agent();
		$tracking_data_array['uip'] = $this->get_ip();
		$tracking_data_array['cid'] = $this->get_cid();
		$tracking_data_array['dr']  = $this->get_referrer();
		$tracking_data_array['ds']  = $this->gtm_server_side . '_' . $this->version;
		$tracking_data_array['z']   = time() . wp_rand();

		$track_infos = $this->encode_strings_in_array( $tracking_data_array );

		$tracking_parameter = '';
		foreach ( $track_infos as $parameter => $value ) {
			if ( $value ) {
				$tracking_parameter .= '&' . $parameter . '=' . $value;
			}
		}

		$container_url = $this->get_server_side_container_url();

		$this->send_track_request( $container_url . '/collect?v=1' . $tracking_parameter, $track_infos['ua'] );
	}

	/**
	 * Get EE data.
	 *
	 * @param int $order_id Order ID.
	 *
	 * @return array
	 */
	private function get_ee_data( $order_id = null ) {
		$tracking_data_array      = array();
		$tracking_data_array['t'] = 'event';

		if ( null === $order_id ) {
			return $tracking_data_array;
		}

		$order_data_collector       = new GTM_Server_Side_Tracking_Collect_Data_Order( $order_id );
		$tracking_data_array['pa']  = $order_data_collector->get_product_action();
		$tracking_data_array['ti']  = $order_data_collector->get_order_id();
		$tracking_data_array['tr']  = $order_data_collector->get_revenue();
		$tracking_data_array['tt']  = $order_data_collector->get_tax();
		$tracking_data_array['ts']  = $order_data_collector->get_shipping();
		$tracking_data_array['tcc'] = $order_data_collector->get_coupon_code();

		$order_items = $order_data_collector->get_order_items();
		foreach ( $order_items as $product_index => $order_item ) {
			$tracking_data_array[ 'pr' . $product_index . 'id' ] = $order_item['id'];
			$tracking_data_array[ 'pr' . $product_index . 'nm' ] = $order_item['name'];
			$tracking_data_array[ 'pr' . $product_index . 'qt' ] = $order_item['qty'];
			$tracking_data_array[ 'pr' . $product_index . 'pr' ] = $order_item['productPriceWithTaxes'];
			$tracking_data_array[ 'pr' . $product_index . 'va' ] = $order_item['variation_id'];
			$tracking_data_array[ 'pr' . $product_index . 'ca' ] = $order_item['categories'];
			$tracking_data_array[ 'pr' . $product_index . 'br' ] = $order_item['tags'];
		}

		return $tracking_data_array;
	}

	/**
	 * Is backend tracking.
	 *
	 * @return bool
	 */
	private function is_backend_tracking() {
		return get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS ) && GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF !== $this->get_option( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT );
	}

	/**
	 * Is web tracking.
	 *
	 * @return bool
	 */
	protected function is_add_web_snippet() {
		return get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS ) && GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE !== $this->get_option( GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT );
	}

	/**
	 * Get attr option.
	 *
	 * @param string $id The option ID.
	 *
	 * @return string
	 */
	protected function get_option( $id ) {
		return isset( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] ) ? get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ $id ] : '';
	}
}
