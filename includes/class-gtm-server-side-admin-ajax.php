<?php
/**
 * Assets for admin.
 *
 * @package    GTM_Server_Side
 * @subpackage GTM_Server_Side/includes
 * @since      2.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Assets for admin.
 */
class GTM_Server_Side_Admin_Ajax {
	use GTM_Server_Side_Singleton;

	/**
	 * Container url.
	 *
	 * @var string
	 */
	private $container_url;

	/**
	 * Init.
	 *
	 * @return void
	 */
	public function init() {
		if ( ! GTM_Server_Side_Helpers::is_enable_webhook() ) {
			return;
		}

		add_action( 'wp_ajax_gtm_server_side_webhook_test', array( $this, 'gtm_server_side_webhook_test' ) );
	}

	/**
	 * Test webhook
	 *
	 * @return void
	 */
	public function gtm_server_side_webhook_test() {
		check_ajax_referer( GTM_SERVER_SIDE_AJAX_SECURITY, 'security' );

		remove_action( 'wp_ajax_gtm_server_side_webhook_test', array( $this, 'gtm_server_side_webhook_test' ) );

		$this->container_url = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_CONTAINER_URL );
		if ( empty( $this->container_url ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'GTM server container URL is required.', 'gtm-server-side' ),
				)
			);
		}

		$is_refund     = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_REFUND );
		$is_purchase   = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PURCHASE );
		$is_processing = GTM_Server_Side_Helpers::get_option( GTM_SERVER_SIDE_FIELD_WEBHOOKS_PROCESSING );
		if ( empty( $is_purchase ) && empty( $is_refund ) && empty( $is_processing ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Purchase or order paid or refund webhook is required.', 'gtm-server-side' ),
				)
			);
		}

		$answer = array();
		if ( ! empty( $is_purchase ) ) {
			$answer[] = $this->send_webhook_purchase();
		}

		if ( ! empty( $is_processing ) ) {
			$answer[] = $this->send_webhook_processing();
		}

		if ( ! empty( $is_refund ) ) {
			$answer[] = $this->send_webhook_refund();
		}

		try {
			wp_send_json_success(
				array(
					'message' => join( ' ', $answer ),
				)
			);
		} catch ( Exception $e ) {
			wp_send_json_error(
				array(
					'message' => __( 'An error occurred during data processing.', 'gtm-server-side' ),
				)
			);
		}
		exit;
	}

	/**
	 * Send webhooks purchase.
	 *
	 * @return string
	 */
	private function send_webhook_purchase() {
		$request = array(
			'event'     => 'purchase',
			'ecommerce' => array(
				'transaction_id' => '358',
				'affiliation'    => 'test',
				'value'          => 18.00,
				'tax'            => 0,
				'shipping'       => 0,
				'currency'       => 'USD',
				'coupon'         => 'test_coupon',
				'items'          => array(
					array(
						'item_name'      => 'Beanie',
						'item_brand'     => 'Stape',
						'item_id'        => '15',
						'item_sku'       => 'woo-beanie',
						'price'          => 18.00,
						'item_category'  => 'Clothing',
						'item_category2' => 'Accessories',
						'quantity'       => 1,
						'index'          => 1,
					),
				),
			),
		);

		$result = $this->send_request( $request );
		if ( is_wp_error( $result ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Some problem with Purchase webhook.', 'gtm-server-side' ),
				)
			);
		}

		return __( 'Purchase webhook sent.', 'gtm-server-side' );
	}

	/**
	 * Send webhooks processing (order paid).
	 *
	 * @return string
	 */
	private function send_webhook_processing() {
		$request = array(
			'event'     => 'order_paid',
			'ecommerce' => array(
				'transaction_id' => '358',
				'affiliation'    => 'test',
				'value'          => 18.00,
				'tax'            => 0,
				'shipping'       => 0,
				'currency'       => 'USD',
				'coupon'         => 'test_coupon',
				'items'          => array(
					array(
						'item_name'      => 'Beanie',
						'item_brand'     => 'Stape',
						'item_id'        => '15',
						'item_sku'       => 'woo-beanie',
						'price'          => 18.00,
						'item_category'  => 'Clothing',
						'item_category2' => 'Accessories',
						'quantity'       => 1,
						'index'          => 1,
					),
				),
			),
		);

		$result = $this->send_request( $request );
		if ( is_wp_error( $result ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Some problem with Purchase webhook.', 'gtm-server-side' ),
				)
			);
		}

		return __( 'Order paid webhook sent.', 'gtm-server-side' );
	}

	/**
	 * Send webhooks refund.
	 *
	 * @return string
	 */
	private function send_webhook_refund() {
		$request = array(
			'event'     => 'refund',
			'ecommerce' => array(
				'transaction_id' => '358',
				'value'          => 18.00,
				'currency'       => 'USD',
				'items'          => array(
					array(
						'item_name'      => 'Beanie',
						'item_brand'     => 'Stape',
						'item_id'        => '15',
						'item_sku'       => 'woo-beanie',
						'price'          => 18.00,
						'item_category'  => 'Clothing',
						'item_category2' => 'Accessories',
						'quantity'       => 1,
						'index'          => 1,
					),
				),
			),
		);

		$result = $this->send_request( $request );
		if ( is_wp_error( $result ) ) {
			wp_send_json_error(
				array(
					'message' => __( 'Some problem with Refund webhook.', 'gtm-server-side' ),
				)
			);
		}

		return __( 'Refund webhook sent.', 'gtm-server-side' );
	}

	/**
	 * Send request.
	 *
	 * @param  array $body post data.
	 * @return array|WP_Error The response or WP_Error on failure.
	 */
	private function send_request( $body ) {
		$body['user_data'] = $this->get_request_user_data();

		return wp_remote_post(
			$this->container_url,
			array(
				'headers' => array(
					'cache-control' => 'no-cache',
					'content-type'  => 'application/json',
				),
				'body'    => wp_json_encode( $body ),
			)
		);
	}

	/**
	 * Return user request test data
	 *
	 * @return array
	 */
	private function get_request_user_data() {
		return array(
			'customer_id'         => 69,
			'billing_first_name'  => 'Test',
			'billing_last_name'   => 'Name',
			'billing_address'     => '3601 Old Capitol Trail',
			'billing_postcode'    => '19808',
			'billing_country'     => 'US',
			'billing_state'       => 'Delaware',
			'billing_city'        => 'Wilmington',
			'billing_email'       => 'mytest@example.com',
			'billing_phone'       => '380999222212',
			'shipping_first_name' => 'Test',
			'shipping_last_name'  => 'Name',
			'shipping_company'    => 'Company',
			'shipping_address'    => '3601 Old Capitol Trail',
			'shipping_postcode'   => '19808',
			'shipping_country'    => 'US',
			'shipping_state'      => 'Delaware',
			'shipping_city'       => 'Wilmington',
			'shipping_phone'      => '380999222212',
			'email'               => 'mytest@example.com',
			'first_name'          => 'Test',
			'last_name'           => 'Name',
			'new_customer'        => 'false',
		);
	}
}
