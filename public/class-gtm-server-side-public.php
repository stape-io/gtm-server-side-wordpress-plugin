<?php

/**
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/public
 */
class GTM_Server_Side_Public {

	public static $printed_noscript_tag = false;

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $gtm_server_side    The ID of this plugin.
	 */
	private $gtm_server_side;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * @var string
	 */
	private $cid;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 * @param      string    $gtm_server_side       The name of the plugin.
	 * @param      string    $version    The version of this plugin.
	 */
	public function __construct( $gtm_server_side, $version ) {

		$this->gtm_server_side = $gtm_server_side;
		$this->version = $version;

	}

	/**
	 * @param string
	 * @return string
	 */
	public function gtm4wp_filter( $value ) {
		return str_replace('www.googletagmanager.com', $this->getServerSideContainerDomain(), $value);
	}

	public function track_cookie_set() {
		if (get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS ) && get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ] !== GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF) {
			return;
		}

		$expireTimeInSeconds = time()+31104000;
		$domain = $this->get_cookie_domain();
		$cid = $this->get_cid();

		if ( PHP_VERSION_ID >= 70300 ) {
			setcookie(GTM_SERVER_SIDE_COOKIE_NAME, $cid, array("expires" => $expireTimeInSeconds, "path" => "/", "domain" => $domain, "samesite" => "lax", "httponly" => true));
		} else {
			setcookie(GTM_SERVER_SIDE_COOKIE_NAME, $cid, $expireTimeInSeconds, "/; samesite=lax", $domain, false, true);
		}
	}

	public function track_pageview() {
		if (get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS ) && get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ] !== GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_OFF) {
			return;
		}

		if ($_SERVER['REQUEST_METHOD'] === 'POST' || $this->is_url_blacklisted()) {
			return;
		}

		$tracking_data_array = [];
		$tracking_data_array["t"] = "pageview";
		$tracking_data_array['tid'] = get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_GA_ID ];
		$tracking_data_array['dl'] = $this->get_url();
		$tracking_data_array['ua'] = $this->get_user_agent();
		$tracking_data_array['uip'] = $this->get_ip();
		$tracking_data_array['cid'] = $this->get_cid();
		$tracking_data_array['dr'] = $this->get_referrer();
		$tracking_data_array['ds'] = $this->gtm_server_side.'_'.$this->version;
		$tracking_data_array['z'] = time() . mt_rand();

		$trackInfos = $this->encode_strings_in_array($tracking_data_array);

		$trackingParameter = "";
		foreach ($trackInfos as $parameter => $value) {
			if ($value) {
				$trackingParameter .= "&" . $parameter . "=" . $value;
			}
		}

		$trackUrl = $this->getServerSideContainerUrl();

		$this->send_track_request( $trackUrl . '/collect?v=1' . $trackingParameter, $trackInfos["ua"]);
	}

	/**
	 * @noinspection EqualityComparisonWithCoercionJS
	 * @noinspection UnknownInspectionInspection
	 */
	public function gtm_head() {
		if (get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS ) && get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ] !== GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE) {
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

		if (get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS ) && get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT ] !== GTM_SERVER_SIDE_WEB_CONTAINER_PLACEMENT_CODE) {
			return;
		}

		echo '
		<!-- Google Tag Manager (noscript) -->
		<noscript><iframe src="https://www.googletagmanager.com/ns.html?id='.esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_WEB_CONTAINER_ID ] ).'"
		                  height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
		<!-- End Google Tag Manager (noscript) -->
		';
	}

	/**
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

		$url = $_SERVER["REQUEST_URI"];

		foreach ( $blacklist as $iValue ) {
			if (preg_match( "/\." . $iValue . "(\W|$)/", $url)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * @param string $url
	 * @param string $user_agent_string
	 */
	private function send_track_request($url, $user_agent_string)
	{
		$curl = curl_init();
		curl_setopt_array($curl, array(
			CURLOPT_URL => $url,
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_CUSTOMREQUEST => "GET",
			CURLOPT_HTTPHEADER => array(
				"cache-control: no-cache",
				"User-Agent: " . $user_agent_string,
			),
		));
		curl_exec($curl);
		curl_close($curl);

	}

	/**
	 * @param mixed[] $arrRawStrings
	 *
	 * @return mixed[]
	 */
	private function encode_strings_in_array($arrRawStrings)
	{
		$arrEncodedStrings = array();
		foreach ($arrRawStrings as $key => $stringRaw) {
			$arrEncodedStrings[$key] = mb_convert_encoding($stringRaw, "UTF-8", mb_detect_encoding($stringRaw));
			$arrEncodedStrings[$key] = urlencode($arrEncodedStrings[$key]);
		}

		return $arrEncodedStrings;
	}

	/**
	 * @return string
	 */
	private function get_url()
	{
		return (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
	}

	/**
	 * @return string
	 */
	private function get_user_agent()
	{
		$useragent = "not_set";
		if (isset($_SERVER['HTTP_USER_AGENT'])) {
			$useragent = $_SERVER['HTTP_USER_AGENT'];
		}
		return $useragent;
	}

	/**
	 * @return string
	 */
	private function get_ip()
	{
		$ipaddress = '0.0';
		$keys=array('HTTP_CLIENT_IP','HTTP_X_FORWARDED_FOR','HTTP_X_FORWARDED','HTTP_FORWARDED_FOR','HTTP_FORWARDED','REMOTE_ADDR');
		foreach($keys as $k)
		{
			if (isset($_SERVER[$k]) && !empty($_SERVER[$k]) && filter_var($_SERVER[$k], FILTER_VALIDATE_IP))
			{
				$ipaddress = $_SERVER[$k];
				break;
			}
		}

		return $ipaddress;
	}

	/**
	 * @return string
	 */
	public function get_referrer()
	{
		$ref = '';
		if (isset($_SERVER['HTTP_REFERER'])) {
			$ref = $_SERVER['HTTP_REFERER'];
		}

		return $ref;
	}

	/**
	 * @return string
	 */
	private function get_cid() {
		if ($this->cid) {
			return $this->cid;
		}

		if (isset($_COOKIE[GTM_SERVER_SIDE_COOKIE_NAME]) && $_COOKIE[GTM_SERVER_SIDE_COOKIE_NAME]) {
			$this->cid = $_COOKIE[GTM_SERVER_SIDE_COOKIE_NAME];

			return $this->cid;
		}

		$this->cid = time() . "." . mt_rand(100000000, 900000000);

		return $this->cid;
	}

	/**
	 * @return string
	 */
	private function get_cookie_domain()
	{
		return parse_url(home_url())['host'];
	}

	/**
	 * @return string
	 */
	private function getServerSideContainerUrl() {
		return esc_attr( get_option( GTM_SERVER_SIDE_ADMIN_OPTIONS )[ GTM_SERVER_SIDE_SERVER_CONTAINER_URL ] );
	}

	/**
	 * @return string
	 */
	private function getServerSideContainerDomain() {
		return str_replace('https://', '', $this->getServerSideContainerUrl());
	}
}
