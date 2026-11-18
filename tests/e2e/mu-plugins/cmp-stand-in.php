<?php
/**
 * Plugin Name:       GTM Server Side e2e CMP stand-in
 * Description:       Test-only. Plays a consent platform restoring a stored choice in wp_head, before the plugin's consent script, for the requests of one e2e test. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * The "CMP stand-in" fixtures of the Testomat folder "GTM snippet injection":
 * a consent tool such as CookieYes pushes the visitor's stored consent from a
 * synchronous script at wp_head priority 1, so it is in the dataLayer before
 * the plugin's consent script (priority 10) runs.
 *
 * @package GTM_Server_Side_E2E_CMP_Stand_In
 */

defined( 'ABSPATH' ) || exit;

/** Cookie the testPlugins.cmpStandIn() fixture sets: one of the keys below. */
const GTM_SERVER_SIDE_E2E_CMP_STAND_IN_COOKIE = 'gtm_e2e_cmp_stand_in';

/** The consent commands each stand-in pushes, as the cases spell them. */
const GTM_SERVER_SIDE_E2E_CMP_STAND_INS = array(
	// "CMP stand-in": a stored analytics_storage grant.
	'granted'        => 'gtag("consent","default",{analytics_storage:"granted"});',
	// "CMP stand-in "grant, then denial"": a regional default grant, then the
	// visitor's stored denial.
	'granted-denied' => 'gtag("consent","default",{ad_storage:"granted",analytics_storage:"granted"});gtag("consent","update",{ad_storage:"denied",analytics_storage:"denied"});',
);

// Off anywhere but a local install, so a visitor's cookie can't change what a
// shared site tells GTM.
if ( 'local' === wp_get_environment_type() ) {
	add_action(
		'wp_head',
		static function () {
			// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- test-only, used only as a key of the list above.
			$key = isset( $_COOKIE[ GTM_SERVER_SIDE_E2E_CMP_STAND_IN_COOKIE ] ) ? (string) $_COOKIE[ GTM_SERVER_SIDE_E2E_CMP_STAND_IN_COOKIE ] : '';
			if ( ! isset( GTM_SERVER_SIDE_E2E_CMP_STAND_INS[ $key ] ) ) {
				return;
			}
			echo '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}' . GTM_SERVER_SIDE_E2E_CMP_STAND_INS[ $key ] . "</script>\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- a constant of this file.
		},
		1
	);
}
