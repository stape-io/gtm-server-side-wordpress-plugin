<?php
/**
 * WC Session Storage class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * WC Session Storage class.
 */
class GTM_Server_Side_WC_Session_Storage implements GTM_Server_Side_Storage_Interface {
	/**
	 * Set session (or fallback to cookie set).
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $value Value.
	 * @param  array $args Arguments.
	 * @return void
	 */
	public static function set( $name, $value, $args = array() ) {
		if ( function_exists( 'WC' ) && isset( WC()->session ) ) {
			WC()->session->set( $name, $value );
		} else {
			GTM_Server_Side_Cookie_Storage::set( $name, $value, $args );
		}
	}

	/**
	 * Return session value (or fallback to cookie get).
	 *
	 * @param mixed $name Name.
	 * @param mixed $default Default.
	 * @return mixed
	 */
	public static function get( $name, $default = null ) {
		if ( function_exists( 'WC' ) && isset( WC()->session ) ) {
			return WC()->session->get( $name, $default );
		}

		return GTM_Server_Side_Cookie_Storage::get( $name, $default );
	}

	/**
	 * Has value or not (or fallback to cookie has_value).
	 *
	 * @param string $name Name.
	 * @param mixed  $value Value.
	 * @return bool
	 */
	public static function has_value( $name, $value ) {
		if ( function_exists( 'WC' ) && isset( WC()->session ) ) {
			$val = WC()->session->get( $name );
			return $val === $value;
		}

		return GTM_Server_Side_Cookie_Storage::has_value( $name, $value );
	}

	/**
	 * Delete session (or fallback to cookie delete_by_javascript).
	 *
	 * @param string $name Name.
	 * @return void
	 */
	public static function delete( $name ) {
		if ( function_exists( 'WC' ) && isset( WC()->session ) ) {
			WC()->session->set( $name, null );
		}

		GTM_Server_Side_Cookie_Storage::delete( $name );
	}
}
