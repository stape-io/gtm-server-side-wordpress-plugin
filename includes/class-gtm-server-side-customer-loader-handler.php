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

		$url     = sprintf( 'https://api.app.stape.io/api/v2/container/%s/custom-loader', rawurlencode( $gtm_container_identifier ) );
		$headers = array(
			'accept'       => '*/*',
			'content-type' => 'application/json',
		);

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

		$response_raw = wp_remote_post(
			$url,
			array(
				'headers' => $headers,
				'body'    => wp_json_encode( $data ),
				'timeout' => 20,
			)
		);

		if ( is_wp_error( $response_raw ) ) {
			return $response_raw;
		}

		$status_code = (int) wp_remote_retrieve_response_code( $response_raw );
		$raw_body    = (string) wp_remote_retrieve_body( $response_raw );

		if ( $status_code < 200 || $status_code >= 300 ) {
			return new WP_Error(
				'stape_api_http_error',
				sprintf( 'Stape API error. HTTP %d.', $status_code ),
				array(
					'status_code' => $status_code,
					'body'        => $raw_body,
					'endpoint'    => $url,
					'request'     => $data,
				)
			);
		}

		$decoded = json_decode( $raw_body, true );

		return ( json_last_error() === JSON_ERROR_NONE ) ? $decoded : $raw_body;
	}
}
