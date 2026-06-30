<?php
/**
 * Customer Loader Handler.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Customer Loader Handler.
 */
class GTM_Server_Side_Customer_Loader_Handler {
	use GTM_Server_Side_Singleton;

	/**
	 * Send data.
	 *
	 * @return mixed
	 */
	public function send_data() {
		$request_context = $this->get_request_context();
		if ( is_wp_error( $request_context ) ) {
			return $request_context;
		}

		$global_url = sprintf(
			'https://api.app.stape.io/api/v2/container/%s/custom-loader',
			rawurlencode( $request_context['identifier'] )
		);

		$response = $this->request_custom_loader( $global_url, $request_context['data'] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status_code = (int) wp_remote_retrieve_response_code( $response );

		/**
		 * Retry only on 404.
		 */
		if ( 404 === $status_code ) {
			$eu_url = sprintf(
				'https://api.app.eu.stape.io/api/v2/container/%s/custom-loader',
				rawurlencode( $request_context['identifier'] )
			);

			$response = $this->request_custom_loader( $eu_url, $request_context['data'] );

			if ( is_wp_error( $response ) ) {
				return $response;
			}
		}

		return $this->parse_response( $response, $request_context['data'] );
	}

	/**
	 * Execute custom loader request.
	 *
	 * @param string $url  Endpoint URL.
	 * @param array  $data Request data.
	 *
	 * @return array|WP_Error
	 */
	private function request_custom_loader( $url, $data ) {
		return wp_remote_post(
			$url,
			array(
				'headers' => array(
					'accept'       => '*/*',
					'content-type' => 'application/json',
				),
				'body'    => wp_json_encode( $data ),
				'timeout' => 20,
			)
		);
	}

	/**
	 * Build custom-loader request context for current mode.
	 *
	 * @return array|WP_Error
	 */
	private function get_request_context() {
		if ( GTM_Server_Side_Helpers::has_same_origin_settings() ) {
			return $this->get_same_origin_request_context();
		}

		return $this->get_default_request_context();
	}

	/**
	 * Build custom-loader request context for the default mode.
	 *
	 * @return array|WP_Error
	 */
	private function get_default_request_context() {
		$gtm_container_identifier = GTM_Server_Side_Helpers::get_raw_gtm_container_identifier();
		if ( empty( $gtm_container_identifier ) ) {
			return new WP_Error( 'missing_container_identifier', 'GTM Container Identifier is missing.' );
		}

		$gtm_container_id = GTM_Server_Side_Helpers::get_raw_gtm_container_id();
		if ( empty( $gtm_container_id ) ) {
			return new WP_Error( 'missing_container_id', 'GTM Container ID is missing.' );
		}

		$gtm_container_url = GTM_Server_Side_Helpers::get_raw_gtm_container_url();
		if ( empty( $gtm_container_url ) ) {
			return new WP_Error( 'missing_container_url', 'GTM Container URL is missing.' );
		}

		$data = array(
			'webGtmId'            => $gtm_container_id,
			'domain'              => '',
			'source'              => 'wordpress',
			'dataLayerObjectName' => 'dataLayer',
		);

		$parsed_url = wp_parse_url( $gtm_container_url );

		if ( ! empty( $parsed_url['host'] ) ) {
			$data['domain'] = $parsed_url['host'];
		}

		if ( ! empty( $parsed_url['path'] ) ) {
			$data['sameOriginPath'] = $parsed_url['path'];
		}

		if ( GTM_Server_Side_Helpers::is_enable_cookie_keeper() ) {
			$data['userIdentifierType']  = 'cookie';
			$data['userIdentifierValue'] = GTM_SERVER_SIDE_COOKIE_KEEPER_NAME;
		}

		return array(
			'identifier' => $gtm_container_identifier,
			'data'       => $data,
		);
	}

	/**
	 * Build custom-loader request context for same-origin mode.
	 *
	 * @return array|WP_Error
	 */
	private function get_same_origin_request_context() {
		$api_key = trim( GTM_Server_Side_Helpers::get_same_origin_api_key() );
		if ( '' === $api_key ) {
			return new WP_Error( 'missing_same_origin_api_key', 'Stape same-origin API key is missing.' );
		}

		$api_key_parts = explode( ':', $api_key );
		if (
			count( $api_key_parts ) < 3 ||
			'' === $api_key_parts[0] ||
			'' === $api_key_parts[1] ||
			'' === $api_key_parts[2]
		) {
			return new WP_Error( 'invalid_same_origin_api_key', 'Stape same-origin API key format is invalid.' );
		}

		$gtm_container_id = GTM_Server_Side_Helpers::get_raw_gtm_container_id();
		if ( empty( $gtm_container_id ) ) {
			return new WP_Error( 'missing_container_id', 'GTM Container ID is missing.' );
		}

		$same_origin_url = home_url( GTM_Server_Side_Helpers::get_raw_same_origin_path() );
		$parsed_url      = wp_parse_url( $same_origin_url );
		$domain          = '';

		if ( ! empty( $parsed_url['host'] ) ) {
			$domain = $parsed_url['host'];
			if ( ! empty( $parsed_url['port'] ) ) {
				$domain .= ':' . $parsed_url['port'];
			}
		}

		$same_origin_path = '';
		if ( ! empty( $parsed_url['path'] ) ) {
			$same_origin_path = $parsed_url['path'];
			if ( '/' !== $same_origin_path ) {
				$same_origin_path = rtrim( $same_origin_path, '/' );
			}
		}

		$data = array(
			'webGtmId'            => $gtm_container_id,
			'domain'              => $domain,
			'sameOriginPath'      => $same_origin_path,
			'source'              => 'wordpress',
			'dataLayerObjectName' => 'dataLayer',
		);

		return array(
			'identifier' => $api_key_parts[1],
			'data'       => $data,
		);
	}

	/**
	 * Parse API response.
	 *
	 * @param array $response Response.
	 * @param array $request  Original request.
	 *
	 * @return mixed
	 */
	private function parse_response( $response, $request ) {
		$status_code = (int) wp_remote_retrieve_response_code( $response );
		$raw_body    = (string) wp_remote_retrieve_body( $response );

		if ( $status_code < 200 || $status_code >= 300 ) {
			return new WP_Error(
				'stape_api_http_error',
				sprintf( 'Stape API error. HTTP %d.', $status_code ),
				array(
					'status_code' => $status_code,
					'body'        => $raw_body,
					'request'     => $request,
				)
			);
		}

		$decoded = json_decode( $raw_body, true );

		return ( json_last_error() === JSON_ERROR_NONE ) ? $decoded : $raw_body;
	}
}
