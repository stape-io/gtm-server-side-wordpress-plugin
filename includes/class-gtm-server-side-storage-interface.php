<?php
/**
 * Storage Interface.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * Storage Interface.
 */
interface GTM_Server_Side_Storage_Interface {
	/**
	 * Set data.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $value Value.
	 * @param  array $args Arguments.
	 * @return void
	 */
	public static function set( $name, $value, $args = array() );

	/**
	 * Return data.
	 *
	 * @param mixed $name Name.
	 * @param mixed $default Default.
	 * @return mixed
	 */
	public static function get( $name, $default = null );

	/**
	 * Has value or not.
	 *
	 * @param string $name Name.
	 * @param mixed  $value Value.
	 * @return bool
	 */
	public static function has_value( $name, $value );

	/**
	 * Delete data.
	 *
	 * @param string $name Name.
	 * @return void
	 */
	public static function delete( $name );
}
