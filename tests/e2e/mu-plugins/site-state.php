<?php
/**
 * Plugin Name:       GTM Server Side e2e site state
 * Description:       Test-only. Reads and puts back the site-wide state a serial e2e test may change, for the siteState fixture. Works on a local environment only.
 * Version:           1.0.0
 * Requires PHP:      7.4
 * Author:            Stape
 *
 * A serial test changes what every page reads: it saves a settings tab in
 * wp-admin, runs cron, deactivates a plugin. The siteState fixture reads the
 * state below before such a test and puts it back after it, over REST, as an
 * administrator.
 *
 * The rows go back as they were, raw, so no update_option_<name> hook runs on
 * the way back. What those hooks derive from a setting - the custom loader
 * and its error, the loader cache, the proxy path's rewrite rule - is part of
 * the state too, so it comes back with the setting instead of being derived
 * again (which would send the Stape API the baseline's placeholders, and
 * can't turn the same-origin proxy back on without an API key anyway).
 *
 * @package GTM_Server_Side_E2E_Site_State
 */

defined( 'ABSPATH' ) || exit;

/**
 * Options that make up the state, as SQL LIKE patterns: the plugin's settings
 * and what it derives from them (its options), its transients (the loader
 * cache), the rewrite rules (the same-origin proxy path's) and the active
 * plugins. Content - products, orders, users - is not here: fixtures delete
 * what a test creates.
 */
const GTM_SERVER_SIDE_E2E_SITE_STATE_OPTIONS = array(
	'gtm\_server\_side\_%',
	'\_transient\_gtm\_server\_side\_%',
	'\_transient\_timeout\_gtm\_server\_side\_%',
	'rewrite\_rules',
	'active\_plugins',
);

/** Cron events whose hook starts with this are part of the state: the plugin's own. */
const GTM_SERVER_SIDE_E2E_SITE_STATE_CRON_PREFIX = 'gtm_server_side';

/** The options of the state: name => [ value as stored (serialized), autoload ], by name. */
function gtm_server_side_e2e_site_state_options(): array {
	global $wpdb;

	$where = implode(
		' OR ',
		array_map(
			static function ( string $pattern ) use ( $wpdb ): string {
				return $wpdb->prepare( 'option_name LIKE %s', $pattern );
			},
			GTM_SERVER_SIDE_E2E_SITE_STATE_OPTIONS
		)
	);

	// phpcs:ignore WordPress.DB -- test-only, raw on purpose (see the file comment); $where is built from prepared parts.
	$rows = $wpdb->get_results( "SELECT option_name, option_value, autoload FROM {$wpdb->options} WHERE {$where}", ARRAY_A );

	$options = array();
	foreach ( $rows as $row ) {
		$options[ $row['option_name'] ] = array( $row['option_value'], $row['autoload'] );
	}
	ksort( $options );

	return $options;
}

/** The plugin's cron events: "<hook> <key>" => [ timestamp, event ], by hook. */
function gtm_server_side_e2e_site_state_cron(): array {
	$events = array();
	foreach ( _get_cron_array() as $timestamp => $hooks ) {
		foreach ( $hooks as $hook => $instances ) {
			if ( 0 !== strpos( (string) $hook, GTM_SERVER_SIDE_E2E_SITE_STATE_CRON_PREFIX ) ) {
				continue;
			}
			foreach ( $instances as $key => $event ) {
				$events[ "$hook $key" ] = array( $timestamp, $event );
			}
		}
	}
	ksort( $events );

	return $events;
}

/** The state, as the siteState fixture reads it. */
function gtm_server_side_e2e_site_state(): array {
	return array(
		'options' => gtm_server_side_e2e_site_state_options(),
		'cron'    => gtm_server_side_e2e_site_state_cron(),
	);
}

/** Puts `$state`, as read by gtm_server_side_e2e_site_state(), back. */
function gtm_server_side_e2e_site_state_restore( array $state ): void {
	global $wpdb;

	$want = (array) ( $state['options'] ?? array() );
	$have = gtm_server_side_e2e_site_state_options();

	// phpcs:disable WordPress.DB.DirectDatabaseQuery -- raw on purpose: no option hook may run (see the file comment).
	foreach ( array_keys( array_diff_key( $have, $want ) ) as $name ) {
		$wpdb->delete( $wpdb->options, array( 'option_name' => $name ) );
	}
	foreach ( $want as $name => list( $value, $autoload ) ) {
		if ( ( $have[ $name ] ?? null ) !== array( $value, $autoload ) ) {
			$wpdb->replace(
				$wpdb->options,
				array(
					'option_name'  => $name,
					'option_value' => $value,
					'autoload'     => $autoload,
				)
			);
		}
	}
	// phpcs:enable

	wp_cache_delete( 'alloptions', 'options' );
	wp_cache_delete( 'notoptions', 'options' );
	foreach ( array_keys( $want + $have ) as $name ) {
		wp_cache_delete( $name, 'options' );
	}

	// The plugin's events as they were; WordPress's and WooCommerce's untouched.
	$cron = _get_cron_array();
	foreach ( $cron as $timestamp => $hooks ) {
		foreach ( array_keys( $hooks ) as $hook ) {
			if ( 0 === strpos( (string) $hook, GTM_SERVER_SIDE_E2E_SITE_STATE_CRON_PREFIX ) ) {
				unset( $cron[ $timestamp ][ $hook ] );
			}
		}
		if ( empty( $cron[ $timestamp ] ) ) {
			unset( $cron[ $timestamp ] );
		}
	}
	foreach ( (array) ( $state['cron'] ?? array() ) as $id => list( $timestamp, $event ) ) {
		list( $hook, $key )                  = explode( ' ', $id, 2 );
		$cron[ $timestamp ][ $hook ][ $key ] = $event;
	}
	ksort( $cron );
	_set_cron_array( $cron );
}

// Off anywhere but a local install, and for administrators only, so nobody
// can read or rewrite a shared site's settings through it.
if ( 'local' === wp_get_environment_type() ) {
	add_action(
		'rest_api_init',
		static function () {
			$is_admin = static function () {
				return current_user_can( 'manage_options' );
			};
			register_rest_route(
				'gtm-e2e/v1',
				'/site-state',
				array(
					array(
						'methods'             => 'GET',
						'permission_callback' => $is_admin,
						'callback'            => static function () {
							return rest_ensure_response( gtm_server_side_e2e_site_state() );
						},
					),
					// Puts the state in the body back and answers with the state
					// after it, for the fixture to compare.
					array(
						'methods'             => 'PUT',
						'permission_callback' => $is_admin,
						'callback'            => static function ( WP_REST_Request $request ) {
							gtm_server_side_e2e_site_state_restore( (array) $request->get_json_params() );
							return rest_ensure_response( gtm_server_side_e2e_site_state() );
						},
					),
				)
			);
		}
	);
}
