<?php
/**
 * Plugin Name: E2E same-origin upstream stub
 * Description: Answers the same-origin proxy's upstream requests with the URL they were sent to.
 *
 * Loaded only by the e2e environment (mapped in .wp-env.e2e.json). A proxy spec
 * supplies a same-origin API key ending in ":test" through storeOptions(), so
 * the proxy forwards to https://<a1>.<a0>.stape.test, which this answers
 * instead of the network. The body is the full upstream URL, which lets a spec
 * assert the exact path and query string the container would have received.
 * Any other host is left alone, so the stub is inert for every other spec.
 *
 * @package GTM_Server_Side
 */

defined( 'ABSPATH' ) || exit;

add_filter(
	'pre_http_request',
	function ( $preempt, $args, $url ) {
		$host = (string) wp_parse_url( $url, PHP_URL_HOST );
		if ( '.stape.test' !== substr( $host, -strlen( '.stape.test' ) ) ) {
			return $preempt;
		}

		return array(
			'headers'  => array( 'content-type' => 'text/plain; charset=utf-8' ),
			'body'     => $url,
			'response' => array(
				'code'    => 200,
				'message' => 'OK',
			),
			'cookies'  => array(),
			'filename' => null,
		);
	},
	10,
	3
);
