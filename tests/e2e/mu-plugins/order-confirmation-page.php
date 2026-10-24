<?php
/**
 * Plugin Name:       GTM Server Side e2e order confirmation page
 * Description:       Test-only. Marks the page its cookie names as an order confirmation page, through the plugin's gtm_server_side_is_order_confirmation_page filter, for the requests of one e2e test. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * Stands in for the code a shop with its own thank-you page adds. Only the
 * browser that carries the cookie sees the page as one, so a test's page
 * never pushes another test's purchase.
 *
 * @package GTM_Server_Side_E2E_Order_Confirmation_Page
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the testPlugins.markOrderConfirmationPage() fixture sets: the page's ID. */
const GTM_SERVER_SIDE_E2E_CONFIRMATION_PAGE_COOKIE = 'gtm_e2e_order_confirmation_page';

/** The page ID from the cookie, or 0 when the request carries none. */
function gtm_server_side_e2e_confirmation_page_id(): int {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, matched against a strict pattern below.
	$id = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_CONFIRMATION_PAGE_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_CONFIRMATION_PAGE_COOKIE ] : '';

	return preg_match( '/^\d{1,10}$/', $id ) ? (int) $id : 0;
}

// Off anywhere but a local install, so a visitor's cookie can't make a page
// of a shared site push purchases.
if ( 'local' === wp_get_environment_type() && gtm_server_side_e2e_confirmation_page_id() ) {
	add_filter(
		'gtm_server_side_is_order_confirmation_page',
		static function ( $is_confirmation_page ) {
			return $is_confirmation_page || is_page( gtm_server_side_e2e_confirmation_page_id() );
		}
	);
}
