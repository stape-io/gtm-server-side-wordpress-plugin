<?php
/**
 * API Handler for Data Manager Ingest.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * API Handler for Data Manager Ingest.
 */
class GTM_Server_Side_Handler_Data_Manager_Ingest {
	use GTM_Server_Side_Singleton;

	/**
	 * Send data.
	 *
	 * @param array $params Parameters.
	 * @return mixed
	 */
	public function send_data( array $params ) {
		$bulk_params = array( $params );
		$response    = $this->send_bulk_data( $bulk_params );

		return $response;
	}

	/**
	 * Send bulk data.
	 *
	 * @param array $bulk_params Bulk parameters.
	 * @return mixed
	 */
	public function send_bulk_data( array $bulk_params ) {
		$data = $this->get_prepared_request_data( $bulk_params );
		$url  = $this->get_formatted_endpoint_url();

		$response_raw = wp_remote_post(
			$url,
			array(
				'headers' => array(
					'cache-control'       => 'no-cache',
					'Content-Type'        => 'application/json',
					'x-stape-app-version' => get_gtm_server_side_version(),
				),
				'body'    => wp_json_encode( $data ),
			)
		);

		if ( is_wp_error( $response_raw ) ) {
			return $response_raw;
		}

		$response = wp_remote_retrieve_body( $response_raw );

		return $response;
	}

	/**
	 * Send order.
	 *
	 * @param WC_Order $order Order.
	 * @return mixed
	 */
	public function send_order( $order ) {
		$request_data = $this->get_prepared_order_data( $order );
		if ( false === $request_data ) {
			return $request_data;
		}

		return $this->send_data( $request_data );
	}

	/**
	 * Return prepared order data.
	 *
	 * @param WC_Order $order Order.
	 * @return array|bool
	 */
	public function get_prepared_order_data( $order ) {
		if ( ! $order instanceof WC_Order ) {
			return false;
		}

		$data = array(
			'email_address' => $order->get_billing_email(),
			'phone_number'  => $order->get_billing_phone(),
			'given_name'    => $order->get_billing_first_name(),
			'family_name'   => $order->get_billing_last_name(),
			'region_code'   => $order->get_billing_country(),
			'postal_code'   => $order->get_billing_postcode(),
		);

		$user = $order->get_user();
		if ( $user instanceof WP_User ) {
			if ( empty( $data['email_address'] ) ) {
				$data['email_address'] = $user->user_email;
			}

			if ( empty( $data['given_name'] ) ) {
				$data['given_name'] = $user->first_name;
			}

			if ( empty( $data['family_name'] ) ) {
				$data['family_name'] = $user->last_name;
			}
		}

		return $data;
	}

	/**
	 * Return API key.
	 *
	 * @return string|bool
	 */
	public static function get_api_key() {
		static $cache;

		if ( null !== $cache ) {
			return $cache;
		}

		$cache = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONTAINER_API_KEY, false );

		return $cache;
	}

	/**
	 * Prepared request data.
	 *
	 * @param array $bulk_params Bulk parameters.
	 * @return array
	 */
	private function get_prepared_request_data( array $bulk_params ) {
		$request_data = array();

		$request_destinations = $this->get_prepared_destinations();
		if ( ! empty( $request_destinations ) ) {
			$request_data['destinations'] = array(
				$request_destinations,
			);
		}

		$request_audience_members = array();
		foreach ( $bulk_params as $params ) {
			$request_audience_member = $this->get_prepared_audience_members( $params );
			if ( ! empty( $request_audience_member ) ) {
				$request_audience_members[] = $request_audience_member;
			}
		}

		if ( ! empty( $request_audience_members ) ) {
			$request_data['audienceMembers'] = $request_audience_members;
		}

		$request_data['encoding'] = 'HEX';

		return $request_data;
	}

	/**
	 * Return prepared destinations.
	 *
	 * @return array
	 */
	private function get_prepared_destinations() {
		// Default.
		$req_destinations = array();

		// Options.
		$option_login_cust_id = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_LOGIN_CUST_ID, '' );
		$option_oper_cust_id  = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_GADS_OPER_CUST_ID, '' );
		$option_audience_id   = 'stape_wp_purchasers';
		// phpcs:ignore Squiz.PHP.CommentedOutCode.Found
		// $option_audience_id   = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_AUDIENCE_ID, '' );

		if ( ! empty( $option_login_cust_id ) ) {
			$req_destinations['linkedAccount'] = array(
				'product'   => 'GOOGLE_ADS',
				'accountId' => $option_login_cust_id,
			);
		}

		if ( ! empty( $option_oper_cust_id ) ) {
			$req_destinations['operatingAccount'] = array(
				'product'   => 'GOOGLE_ADS',
				'accountId' => $option_oper_cust_id,
			);
		}

		if ( ! empty( $option_audience_id ) ) {
			$req_destinations['productDestinationId'] = $option_audience_id;
		}

		return $req_destinations;
	}

	/**
	 * Return prepared audience members.
	 *
	 * @param  array $params Params.
	 * @return array
	 */
	private function get_prepared_audience_members( $params ) {
		$params = wp_parse_args(
			$params,
			array(
				'email_address' => '',
				'phone_number'  => '',
				'given_name'    => '',
				'family_name'   => '',
				'region_code'   => '',
				'postal_code'   => '',
			)
		);

		// Default.
		$req_audience_members = array();
		$req_user_identifiers = array();

		// Options.
		$option_consent = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_CONSENT );
		$option_email   = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_EMAIL );
		$option_phone   = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_PHONE );
		$option_address = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_CUST_MATCH_USER_SHARE_ADDRESS );

		if ( ! empty( $option_consent ) ) {
			$req_audience_members['consent'] = array(
				'adUserData'        => $option_consent,
				'adPersonalization' => $option_consent,
			);
		}

		if (
			GTM_SERVER_SIDE_FIELD_VALUE_YES === $option_email &&
			! empty( $params['email_address'] )
		) {
			$req_user_identifiers[] = array( 'emailAddress' => hash( 'sha256', $params['email_address'] ) );
		}

		if (
			GTM_SERVER_SIDE_FIELD_VALUE_YES === $option_phone &&
			! empty( $params['phone_number'] )
		) {
			$req_user_identifiers[] = array( 'phoneNumber' => hash( 'sha256', $this->normalize_to_e164( $params['phone_number'] ) ) );
		}

		if ( GTM_SERVER_SIDE_FIELD_VALUE_YES === $option_address ) {
			$req_user_identifiers_address = array();

			if ( ! empty( $params['given_name'] ) ) {
				$req_user_identifiers_address['givenName'] = hash( 'sha256', $this->full_normalize( $params['given_name'] ) );
			}

			if ( ! empty( $params['family_name'] ) ) {
				$req_user_identifiers_address['familyName'] = hash( 'sha256', $this->full_normalize( $params['family_name'] ) );
			}

			if ( ! empty( $params['region_code'] ) ) {
				$req_user_identifiers_address['region_code'] = $params['region_code'];
			}

			if ( ! empty( $params['postal_code'] ) ) {
				$req_user_identifiers_address['postal_code'] = $params['postal_code'];
			}

			$req_user_identifiers[] = array( 'address' => $req_user_identifiers_address );
		}

		if ( ! empty( $req_user_identifiers ) ) {
			$req_audience_members['userData'] = array(
				'userIdentifiers' => $req_user_identifiers,
			);
		}

		return $req_audience_members;
	}

	/**
	 * Return formatted endpoint url.
	 *
	 * @return string
	 */
	private function get_formatted_endpoint_url() {
		$endpoint = '';
		$api_key  = GTM_Server_Side_Helpers::get_stape_container_api_key();
		if ( $api_key ) {
			$a          = explode( ':', $api_key );
			$domain_end = isset( $a[3] ) ? $a[3] : 'io';
			$url        = 'https://' . $a[1] . '.' . $a[0] . '.stape.' . $domain_end;
			$path       = '/stape-api/' . $a[2] . '/v2/data-manager/ingest';
			$endpoint   = $url . $path;
		}

		/**
		 * Allows you to modify the ENDPOINT URL.
		 *
		 * @param string $endpoint Endpoint URL.
		 */
		$endpoint = apply_filters( 'gtm_server_side_handler_data_manager_ingest_endpoint', $endpoint );

		return $endpoint;
	}

	/**
	 * Normalize to e164.
	 *
	 * @param  string $phone Phone.
	 * @return string
	 */
	private function normalize_to_e164( string $phone ) {
		$digits = preg_replace( '/\D+/', '', $phone );

		return '+' . $digits;
	}

	/**
	 * Full Normalize.
	 *
	 * @param  string $string String.
	 * @return string
	 */
	private function full_normalize( string $string ) {
		if ( function_exists( 'mb_strtolower' ) ) {
			$string = mb_strtolower( $string );
		} else {
			$string = strtolower( $string );
		}

		$string = trim( $string );

		return $string;
	}
}
