<?php
/**
 * Singleton.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Singleton.
 */
trait GTM_Server_Side_Singleton {
	/**
	 * Object instance
	 *
	 * @var object
	 */
	protected static $instance = null;

	/**
	 * Gets the instance
	 *
	 * @return self
	 */
	final public static function instance() {
		if ( is_null( self::$instance ) ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * The constructor
	 */
	final protected function __construct() {
		if ( method_exists( $this, 'init' ) ) {
			$this->init();
		}
	}
}
