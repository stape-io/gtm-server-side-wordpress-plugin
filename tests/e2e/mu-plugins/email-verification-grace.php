<?php
/**
 * Plugin Name:       GTM Server Side e2e email verification grace
 * Description:       Test-only. Ends WooCommerce's 10-minute grace period for guest orders on the requests of one e2e test, so its order pages ask for the email at once. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * A guest's order-received page opened in a new session shows the order
 * without asking for the email only within 10 minutes of the order
 * (woocommerce_order_email_verification_grace_period). A case about the link
 * from the order email, opened later, would otherwise wait that long.
 *
 * @package GTM_Server_Side_E2E_Email_Verification_Grace
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the testPlugins.endEmailVerificationGrace() fixture sets, to `1`. */
const GTM_SERVER_SIDE_E2E_NO_GRACE_COOKIE = 'gtm_e2e_no_email_verification_grace';

// Off anywhere but a local install, so a visitor's cookie can't change how a
// shared site guards its orders.
if ( 'local' === wp_get_environment_type() && isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_NO_GRACE_COOKIE ] ) && '1' === $_COOKIE[ GTM_SERVER_SIDE_E2E_NO_GRACE_COOKIE ] ) {
	// Negative rather than zero: an order placed in the same second would
	// still be within a zero-second grace period.
	add_filter(
		'woocommerce_order_email_verification_grace_period',
		static function () {
			return -1;
		}
	);
}
