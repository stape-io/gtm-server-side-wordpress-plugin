/**
 * Admin js file.
 *
 * @package GTM_Server_Side
 */

jQuery( document ).ready(
	function () {
		// Validate.
		const formGtmServerSide = jQuery( '.js-form-gtm-server-side' ).validate(
			{
				rules: {
					gtm_server_side_web_container_id: {
						webContainerId: true
					},
					gtm_server_side_web_container_url: {
						webContainerUrl: true
					},
					gtm_server_side_webhooks_container_url: {
						required: true,
						url: true,
						webhooksContainerUrl: true,
					},
					gtm_server_side_gtm_exclude_roles: {
						gtmExcludeRoles: true
					}
				},
				errorPlacement: function(error, element) {
					if ( element.attr( 'name' ) === 'gtm_server_side_gtm_exclude_roles' ) {
						jQuery( '.js-gtm-server-side-gtm-exclude-roles-message' ).empty().append( error );
					} else {
						error.insertAfter( element );
					}
				}
			}
		);

		// Add validate rules.
		jQuery.validator.addMethod(
			'webContainerId',
			function( value, element ) {
				if ( ! value ) {
					return true;
				}
				return value && /^GTM-.+$/.test( value );
			},
			'Container id must be in GTM-XXXXXX format'
		);
		jQuery.validator.addMethod(
			'webContainerUrl',
			function( value, element ) {
				if ( ! value ) {
					return true;
				}
				return /^https:\/\/[\w\-\.]+(\/[\w\-\.]+)*$/.test( value );
			},
			'URL must be entered with https:// and without slashes at the end'
		);
		jQuery.validator.addMethod(
			'webhooksContainerUrl',
			function( value, element ) {
				if ( ! value ) {
					return true;
				}

				const isPurchaseChecked   = jQuery( '#gtm_server_side_webhooks_purchase' ).is( ':checked' );
				const isProcessingChecked = jQuery( '#gtm_server_side_webhooks_processing' ).is( ':checked' );
				const isCompletedChecked  = jQuery( '#gtm_server_side_webhooks_completed' ).is( ':checked' );
				const isRefundChecked     = jQuery( '#gtm_server_side_webhooks_refund' ).is( ':checked' );

				return isPurchaseChecked || isProcessingChecked || isCompletedChecked || isRefundChecked;
			},
			'Select one or more webhooks'
		);
		jQuery.validator.addMethod(
			'gtmExcludeRoles',
			function( value, element ) {
				if ( value !== 'yes' ) {
					return true;
				}

				return jQuery( '.js-gtm_server_side_gtm_exclude_list_roles:checked' ).length > 0;
			},
			'Select at least one role'
		);

		// Tab "General".
		pluginGtmServerSide.changeContainerId();
		pluginGtmServerSide.validateContainerIdByPlacementPlugin(); // tmp.
		jQuery( '.js-gtm_server_side_placement' ).on(
			'click',
			function() {
				pluginGtmServerSide.changeFieldPlacement(); // tmp.
				pluginGtmServerSide.changeContainerId();
			}
		);
		pluginGtmServerSide.changeWebIdentifier();
		jQuery( '.js-gtm_server_side_web_identifier' ).on(
			'keyup',
			function() {
				pluginGtmServerSide.changeWebIdentifier();
			}
		);

		pluginGtmServerSide.changeExcludeGtmUserRoles();
		jQuery( '.js-gtm_server_side_gtm_exclude_roles' ).on(
			'click',
			pluginGtmServerSide.changeExcludeGtmUserRoles
		);
		// ----------

		// Tab "Data Layer".
		pluginGtmServerSide.initTabDataLayer();
		jQuery( '#gtm_server_side_data_layer_ecommerce' ).click(
			function() {
				pluginGtmServerSide.initTabDataLayer();
			}
		);

		// Advanced parameters — activate native WP postbox toggle.
		const $advParams = jQuery( '#gtm-adv-params' );
		if ( $advParams.length ) {
			if ( typeof postboxes !== 'undefined' ) {
				postboxes.add_postbox_toggles( pagenow );
				const $sortable = jQuery( '#normal-sortables' );
				if ( $sortable.sortable( 'instance' ) ) {
					$sortable.sortable(
						'option',
						'cancel',
						$sortable.sortable( 'option', 'cancel' ) + ', #gtm-adv-params'
					);
				}
			}

			// Meta key reveal on type change.
			$advParams.on( 'change', '.gtm-point-type-select', function () {
				const $row = jQuery( this ).closest( '.gtm-data-point-row' );
				$row.find( '.gtm-meta-key' ).toggleClass( 'is-visible', 'custom' === jQuery( this ).val() );
				pluginGtmServerSide.updateAdvPreview( jQuery( this ).closest( '.gtm-adv-section' ) );
			} );

			// Add data point.
			$advParams.on( 'click', '.gtm-add-data-point', function () {
				const $section   = jQuery( this ).closest( '.gtm-adv-section' );
				const $container = $section.find( '.gtm-data-points-container' );
				const $rows      = $container.find( '.gtm-data-point-row' );
				const limit      = $section.data( 'points-limit' );
				const newIndex   = $rows.length;
				const $addBtn    = $container.find( '.gtm-add-data-point' ).detach();
				const $clone     = $rows.last().clone();

				$clone.find( '[name]' ).each( function () {
					jQuery( this ).attr( 'name', jQuery( this ).attr( 'name' ).replace(
						/\[points\]\[\d+\]/,
						'[points][' + newIndex + ']'
					) );
				} );
				$clone.find( 'select' ).prop( 'selectedIndex', 0 );
				$clone.find( 'input[type=text]' ).val( '' );
				$clone.find( '.gtm-meta-key' ).removeClass( 'is-visible' );
				$container.append( $clone ).append( $addBtn );

				$section.find( '.gtm-add-data-point' ).prop( 'disabled', $container.find( '.gtm-data-point-row' ).length >= limit );
				$container.find( '.gtm-remove-point' ).removeClass( 'is-hidden' );
				$section.find( '.gtm-separator-row' ).removeClass( 'is-hidden' );
				pluginGtmServerSide.updateAdvPreview( $section );
			} );

			// Remove data point.
			$advParams.on( 'click', '.gtm-remove-point', function () {
				const $section   = jQuery( this ).closest( '.gtm-adv-section' );
				const $container = $section.find( '.gtm-data-points-container' );
				if ( $container.find( '.gtm-data-point-row' ).length <= 1 ) {
					return;
				}
				jQuery( this ).closest( '.gtm-data-point-row' ).remove();
				$container.find( '.gtm-data-point-row' ).each( function ( i ) {
					jQuery( this ).find( '[name]' ).each( function () {
						jQuery( this ).attr( 'name', jQuery( this ).attr( 'name' ).replace(
							/\[points\]\[\d+\]/,
							'[points][' + i + ']'
						) );
					} );
				} );
				$section.find( '.gtm-add-data-point' ).prop( 'disabled', false );
				if ( $container.find( '.gtm-data-point-row' ).length === 1 ) {
					$container.find( '.gtm-remove-point' ).addClass( 'is-hidden' );
					$section.find( '.gtm-separator-row' ).addClass( 'is-hidden' );
				}
				pluginGtmServerSide.updateAdvPreview( $section );
			} );

			// Live preview on prefix / separator change.
			$advParams.on( 'input', '.gtm-prefix-input, .gtm-separator-input', function () {
				pluginGtmServerSide.updateAdvPreview( jQuery( this ).closest( '.gtm-adv-section' ) );
			} );

			// Reset to defaults.
			$advParams.on( 'click', '.gtm-reset-to-defaults', function () {
				$advParams.find( '.gtm-adv-section' ).each( function () {
					const $section    = jQuery( this );
					const $container  = $section.find( '.gtm-data-points-container' );
					const defaultType = $section.data( 'default-point' );

					$container.find( '.gtm-data-point-row' ).not( ':first' ).remove();
					const $firstRow = $container.find( '.gtm-data-point-row' );
					$firstRow.find( '.gtm-point-type-select' ).val( defaultType );
					$firstRow.find( '.gtm-meta-key' ).val( '' ).removeClass( 'is-visible' );
					$firstRow.find( '.gtm-remove-point' ).addClass( 'is-hidden' );

					$section.find( '.gtm-prefix-input' ).val( '' );
					$section.find( '.gtm-separator-input' ).val( '' );
					$section.find( '.gtm-separator-row' ).addClass( 'is-hidden' );
					$section.find( '.gtm-add-data-point' ).prop( 'disabled', false );

					pluginGtmServerSide.updateAdvPreview( $section );
				} );
			} );

			// Initial state.
			$advParams.find( '.gtm-adv-section' ).each( function () {
				const $section   = jQuery( this );
				const $container = $section.find( '.gtm-data-points-container' );
				const limit      = $section.data( 'points-limit' );
				$section.find( '.gtm-add-data-point' ).prop( 'disabled', $container.find( '.gtm-data-point-row' ).length >= limit );
				pluginGtmServerSide.updateAdvPreview( $section );
			} );
		}
		// ----------

		// Tab "Webhooks".
		pluginGtmServerSide.initTabWebhooks();
		jQuery( '#gtm_server_side_webhooks_enable' ).click(
			function() {
				pluginGtmServerSide.initTabWebhooks();
			}
		);

		jQuery( '.js-send-test-webhooks' ).on(
			'click',
			function( e ){
				e.preventDefault();

				formGtmServerSide.element( "#gtm_server_side_webhooks_container_url" );
				const $elMessage = jQuery( '.js-ajax-message' );
				$elMessage.html( '<i>' + $elMessage.data( 'message-loading' ) + '</i>' );

				jQuery.post(
					varGtmServerSide.ajax,
					{
						action: 'gtm_server_side_webhook_test',
						security: varGtmServerSide.security,
					},
					function ( response ) {
						if ( ! response.success ) {
							$elMessage.html( '<span class="error">' + response.data.message + '</span>' );
							return false;
						}
						$elMessage.html( '<span class="success">' + response.data.message + '</span>' );
					}
				);
			}
		);
		// ----------

		// Tab "Customer Match".
		pluginGtmServerSide.initTabCustomerMatch();
		jQuery( '#gtm_server_side_field_cust_match_user_share_email, #gtm_server_side_field_cust_match_user_share_phone' ).on(
			'click',
			pluginGtmServerSide.initTabCustomerMatch
		);

		const $backfill         = jQuery( '#gtm_server_side_field_cust_match_backfill' );
		const isBackfillChecked = $backfill.is( ':checked' );
		$backfill.on(
			'click',
			function() {
				if ( true === isBackfillChecked ) {
					jQuery( '#gtm-server-side-btn-submit' ).prop( 'disabled', jQuery( this ).is( ':checked' ) );
				}
			}
		);
		jQuery( '.js-gtm-server-side-backfill-btn-abort-backfill' ).on(
			'click',
			function( e ) {
				e.preventDefault();

				jQuery( '#gtm_server_side_field_cust_match_backfill' ).prop( 'checked', false );
				jQuery( '#gtm-server-side-btn-submit' ).prop( 'disabled', false ).click();
			}
		);

		const idsForSubmitEnabled = [
			'#gtm_server_side_field_cust_match_container_api_key',
			'#gtm_server_side_field_cust_match_gads_oper_cust_id',
			'#gtm_server_side_field_cust_match_gads_login_cust_id',
			'#gtm_server_side_field_cust_match_consent',
			'#gtm_server_side_field_cust_match_user_share_email',
			'#gtm_server_side_field_cust_match_user_share_phone',
			'#gtm_server_side_field_cust_match_user_share_address',
		];

		jQuery( idsForSubmitEnabled.join( ',' ) ).on(
			'change keyup',
			function() {
				jQuery( '#gtm-server-side-btn-submit' ).prop( 'disabled', false );
			}
		);
		// ----------
	}
);

const pluginGtmServerSide = {
	initTabDataLayer: function() {
		const $elUserData = jQuery( '#gtm_server_side_data_layer_user_data' );
		if ( false === jQuery( '#gtm_server_side_data_layer_ecommerce' ).is( ':checked' ) ) {
			$elUserData
				.prop( 'checked', false )
				.prop( 'disabled', true );
		} else {
			$elUserData.prop( 'disabled', false );
		}
	},

	initTabWebhooks: function() {
		const $elContainerUrl = jQuery( '#gtm_server_side_webhooks_container_url' );
		const $elPurchase     = jQuery( '#gtm_server_side_webhooks_purchase' );
		const $elRefund       = jQuery( '#gtm_server_side_webhooks_refund' );
		const $btnTest        = jQuery( '.js-send-test-webhooks' );

		if ( false === jQuery( '#gtm_server_side_webhooks_enable' ).is( ':checked' ) ) {
			$elContainerUrl.prop( 'disabled', true );
			$elPurchase.prop( 'checked', false )
				.prop( 'disabled', true );
			$elRefund.prop( 'checked', false )
				.prop( 'disabled', true );
			$btnTest.prop( 'disabled', true );
		} else {
			$elContainerUrl.prop( 'disabled', false );
			$elPurchase.prop( 'disabled', false );
			$elRefund.prop( 'disabled', false );
			$btnTest.prop( 'disabled', false );
		}
	},

	initTabCustomerMatch: function() {
		const isShareEmailChecked = jQuery( '#gtm_server_side_field_cust_match_user_share_email' ).is( ':checked' );
		const isSharePhoneChecked = jQuery( '#gtm_server_side_field_cust_match_user_share_phone' ).is( ':checked' );
		const $shareAddress       = jQuery( '#gtm_server_side_field_cust_match_user_share_address' );

		if ( isShareEmailChecked && isSharePhoneChecked ) {
			$shareAddress.prop( 'disabled', false );
		} else {
			$shareAddress
				.prop( 'checked', false )
				.prop( 'disabled', true );
		}
	},

	changeContainerId: function() {
		const val   = jQuery( '.js-gtm_server_side_placement:checked' ).val();
		const $elCI = jQuery( '#gtm_server_side_web_container_id' );

		if ( [ 'code', 'plugin' ].includes( val ) ) {
			$elCI.rules(
				'add',
				{
					required: true,
				}
			);
		} else {
			$elCI.rules( 'remove', 'required' );
		}
	},

	changeExcludeGtmUserRoles: function() {
		const $elRole = jQuery( '.js-gtm_server_side_gtm_exclude_roles' );
		const $block  = jQuery( '.js-gtm-server-side-gtm-exclude-roles-block' );

		if ( $elRole.is( ':checked' ) ) {
			$block.show();
		} else {
			$block.hide();
		}
	},

	changeWebIdentifier: function() {
		const $elWebIdentifier = jQuery( '#gtm_server_side_web_identifier' );
		if ( 0 === $elWebIdentifier.length ) {
			return;
		}

		this.changeWebIdentifierCheckboxState( $elWebIdentifier, jQuery( '#gtm_server_side_cookie_keeper' ) );
	},

	changeWebIdentifierCheckboxState: function( $elWebIdentifier, $el ) {
		if ( 0 === $elWebIdentifier.val().length ) {
			$el
				.prop( 'checked', false )
				.prop( 'disabled', true );
		} else {
			$el.prop( 'disabled', false );
		}
	},

	changeFieldPlacement: function() {
		const $placementPlugin = jQuery( 'input[type=hidden]#gtm_server_side_placement-plugin' );
		if ( ! $placementPlugin.length ) {
			return;
		}

		const name = 'gtm_server_side_placement';
		$placementPlugin.attr( 'name', name + '-tmp' );

		jQuery( '.js-gtm_server_side_placement' ).each(
			function() {
				jQuery( this ).attr( 'name', name );
			}
		);
	},

	validateContainerIdByPlacementPlugin: function() {
		const $placementPlugin = jQuery( 'input[type=hidden]#gtm_server_side_placement-plugin' );
		if ( ! $placementPlugin.length ) {
			return;
		}

		if ( 'plugin' === $placementPlugin.val() ) {
			jQuery( '#gtm_server_side_web_container_id' ).rules(
				'add',
				{
					required: true,
				}
			);
		}
	},

	/**
	 * Recompute and display the Result preview for a builder or source section.
	 *
	 * @param {jQuery} $section The .gtm-adv-section element.
	 */
	updateAdvPreview: function( $section ) {
		const $preview = $section.find( '.gtm-result-preview' );
		if ( ! $preview.length ) {
			return;
		}

		const exampleValues = {
			product_id:   '1530',
			variation_id: '1602',
			sku:          'C33S020636',
			gtin:         '12345678',
			custom:       'customValue',
		};

		const prefix    = $section.find( '.gtm-prefix-input' ).val() || '';
		const separator = $section.find( '.gtm-separator-input' ).val() || '';
		const parts     = [];

		$section.find( '.gtm-point-type-select' ).each( function() {
			const type  = jQuery( this ).val();
			const value = exampleValues[ type ] || '';
			if ( value !== '' ) {
				parts.push( value );
			}
		} );

		$preview.text( prefix + parts.join( separator ) || '\u2014' );
	},
};
