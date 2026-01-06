<?php
/**
 * Cookie Storage class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * Cookie Storage class.
 */
class GTM_Server_Side_Cookie_Storage implements GTM_Server_Side_Storage_Interface {
	/**
	 * Set data.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $value Value.
	 * @param  array $args Arguments.
	 * @return void
	 */
	public static function set( $name, $value, $args = array() ) {
		GTM_Server_Side_Cookie_Helper::set(
			$name,
			$value,
			array(
				'secure'   => false,
				'samesite' => '',
			)
		);
	}

	/**
	 * Return data.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $default Default.
	 * @return mixed
	 */
	public static function get( $name, $default = null ) {
		return GTM_Server_Side_Cookie_Helper::get( $name, $default );
	}

	/**
	 * Has value or not.
	 *
	 * @param  string $name Name.
	 * @param  mixed  $value Value.
	 * @return bool
	 */
	public static function has_value( $name, $value ) {
		return GTM_Server_Side_Cookie_Helper::has_value( $name, $value );
	}

	/**
	 * Delete data.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function delete( $name ) {
		GTM_Server_Side_Cookie_Helper::delete_by_javascript( $name );
	}
}
