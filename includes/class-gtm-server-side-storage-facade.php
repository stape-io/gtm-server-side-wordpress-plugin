<?php
/**
 * Storage Facade class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * Storage Facade class.
 */
class GTM_Server_Side_Storage_Facade implements GTM_Server_Side_Storage_Interface {
	/**
	 * Set data.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $value Value.
	 * @param  array $args Arguments.
	 * @return void
	 */
	public static function set( $name, $value, $args = array() ) {
		call_user_func( array( self::get_storage_calss(), 'set' ), $name, $value, $args );
	}

	/**
	 * Return data.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $default Default.
	 * @return mixed
	 */
	public static function get( $name, $default = null ) {
		return call_user_func( array( self::get_storage_calss(), 'get' ), $name, $default );
	}

	/**
	 * Has value or not.
	 *
	 * @param  string $name Name.
	 * @param  mixed  $value Value.
	 * @return bool
	 */
	public static function has_value( $name, $value ) {
		return call_user_func( array( self::get_storage_calss(), 'has_value' ), $name, $value );
	}

	/**
	 * Delete data.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function delete( $name ) {
		call_user_func( array( self::get_storage_calss(), 'delete' ), $name );
	}

	/**
	 * Return storage calss.
	 *
	 * @return string
	 */
	private static function get_storage_calss() {
		// phpcs:ignore
		// return GTM_Server_Side_Cookie_Storage::class;

		// phpcs:ignore
		return GTM_Server_Side_WC_Session_Storage::class;
	}
}
