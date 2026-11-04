<?php
/**
 * Plugin Name:       GTM Server Side e2e Stape API block
 * Description:       Test-only. Blocks the plugin's requests to the Stape API, so no test reaches it. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * Saving the sGTM URL, Web GTM ID, Stape container identifier or Cookie Keeper
 * makes the plugin POST to the Stape API for a custom loader, and so does its
 * 3-hourly cron while no loader is stored. A test saving the placeholder
 * identifiers in wp-admin would send them to the real API, and so would the
 * cron, which runs without any test's cookie while such a test has them in the
 * database. So, unlike the other test plugins, this one is always on: it
 * answers every request to the API hosts with an error, as an unreachable API
 * would, and the plugin stores that as the reason no loader was fetched. No
 * spec expects a loader from the real API.
 *
 * @package GTM_Server_Side_E2E_Block_Stape_API
 */

defined( 'ABSPATH' ) || exit;

/** The hosts GTM_Server_Side_Customer_Loader_Handler posts to: global, then EU on a 404. */
const GTM_SERVER_SIDE_E2E_STAPE_API_HOSTS = array( 'api.app.stape.io', 'api.app.eu.stape.io' );

// Off anywhere but a local install, so a shared site keeps its loader.
if ( 'local' === wp_get_environment_type() ) {
	add_filter(
		'pre_http_request',
		static function ( $preempt, $args, $url ) {
			if ( ! in_array( wp_parse_url( $url, PHP_URL_HOST ), GTM_SERVER_SIDE_E2E_STAPE_API_HOSTS, true ) ) {
				return $preempt;
			}

			return new WP_Error( 'gtm_server_side_e2e_stape_api', 'Blocked by the e2e Stape API block' );
		},
		1,
		3
	);
}
