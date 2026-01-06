<?php
/**
 * Cookie Helper class.
 *
 * @since      2.0.0
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * Cookie Helper class.
 */
class GTM_Server_Side_Cookie_Helper {
	/**
	 * Set cookie.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $value Value.
	 * @param  array $args Arguments.
	 * @return void
	 */
	public static function set( $name, $value, $args = array() ) {
		$args = wp_parse_args(
			$args,
			self::get_default_options()
		);

		if ( version_compare( PHP_VERSION, '7.3.0', '>=' ) ) {
			setcookie(
				$name,
				$value,
				$args,
			);
		} else {
			setcookie(
				$name,
				$value,
				$args['expires'],
				$args['path'],
				$args['domain'],
				$args['secure'],
				$args['httponly']
			);
		}
	}

	/**
	 * Return session.
	 *
	 * @param  mixed $name Name.
	 * @param  mixed $default Default.
	 * @return mixed
	 */
	public static function get( $name, $default = null ) {
		if ( ! isset( $_COOKIE[ $name ] ) ) {
			return $default;
		}

		return filter_input( INPUT_COOKIE, $name, FILTER_DEFAULT );
	}

	/**
	 * Has value or not.
	 *
	 * @param  string $name Name.
	 * @param  mixed  $value Value.
	 * @return bool
	 */
	public static function has_value( $name, $value ) {
		if ( ! isset( $_COOKIE[ $name ] ) ) {
			return false;
		}

		return $_COOKIE[ $name ] === $value;
	}

	/**
	 * Delete cookie.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function delete( $name ) {
		self::set(
			$name,
			'',
			array(
				'expires' => -1,
			)
		);

		if ( isset( $_COOKIE[ $name ] ) ) {
			unset( $_COOKIE[ $name ] );
		}
	}

	/**
	 * Delete cookie using javascript.
	 *
	 * @param  string $name Name.
	 * @return void
	 */
	public static function delete_by_javascript( $name ) {
		$options = self::get_default_options();
		?>
			<script>
				document.cookie = '<?php echo esc_attr( $name ); ?>=; max-age=-1; path=<?php echo esc_attr( $options['path'] ); ?>; domain=<?php echo esc_attr( $options['domain'] ); ?>;';
			</script>
		<?php
	}

	/**
	 * Return default cookie options.
	 *
	 * @return array
	 */
	private static function get_default_options() {
		return array(
			'expires'  => 0,
			'path'     => '/',
			'domain'   => '.' . wp_parse_url( home_url(), PHP_URL_HOST ),
			'secure'   => true,
			'httponly' => false,
			'samesite' => 'lax',
		);
	}
}
