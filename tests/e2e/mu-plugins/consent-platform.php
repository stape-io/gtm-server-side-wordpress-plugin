<?php
/**
 * Plugin Name:       GTM Server Side e2e consent platform
 * Description:       Test-only. Plays a consent platform (CMP) that pushes a stored consent choice into the dataLayer before the plugin's consent script, on the requests of one e2e test. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * A CMP that restores a visitor's stored choice early (CookieYes, say) pushes
 * its consent commands in the head before the plugin's consent script runs.
 * This prints the script of the stand-in the case names, in `wp_head` at
 * priority 1, before the plugin's (priority 10). Nothing leaves the machine.
 *
 * @package GTM_Server_Side_E2E_Consent_Platform
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the testPlugins.consentPlatform() fixture sets: the stand-in's name. */
const GTM_SERVER_SIDE_E2E_CONSENT_PLATFORM_COOKIE = 'gtm_e2e_consent_platform';

/**
 * The stand-ins, by the name the cookie gives, each the script of its case.
 *
 * `granted-then-denied`: a regional default grant, then the visitor's stored
 * denial (case 83880b28).
 */
const GTM_SERVER_SIDE_E2E_CONSENT_PLATFORMS = array(
	'granted-then-denied' => '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("consent","default",{ad_storage:"granted",analytics_storage:"granted"});gtag("consent","update",{ad_storage:"denied",analytics_storage:"denied"});</script>',
);

/** The stand-in's script the cookie names, or '' when the request carries none. */
function gtm_server_side_e2e_consent_platform_script(): string {
	// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, used only as a key of the list above.
	$name = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_CONSENT_PLATFORM_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_CONSENT_PLATFORM_COOKIE ] : '';

	return GTM_SERVER_SIDE_E2E_CONSENT_PLATFORMS[ $name ] ?? '';
}

// Off anywhere but a local install, so a visitor's cookie can't grant or deny
// consent on a shared site.
if ( 'local' === wp_get_environment_type() && '' !== gtm_server_side_e2e_consent_platform_script() ) {
	add_action(
		'wp_head',
		static function () {
			echo gtm_server_side_e2e_consent_platform_script() . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- a fixed script from the list above.
		},
		1
	);
}
