/**
 * Front-end js file.
 *
 * @package GTM_Server_Side
 */

jQuery( document ).ready(
	function () {
		jQuery( document ).on(
			'click',
			'body.woocommerce-cart [name=update_cart]',
			function () {
				pluginGtmServerSide.changeCartQty();
			}
		);

		jQuery( document ).on(
			'keypress',
			'body.woocommerce-cart .woocommerce-cart-form input[type=number]',
			function () {
				pluginGtmServerSide.changeCartQty();
			}
		);

		jQuery( document ).on(
			'click',
			'.add_to_cart_button:not(.product_type_variable, .product_type_grouped, .single_add_to_cart_button)',
			function ( e ) {
				var el = e.target;
				if ( ! el.dataset ) {
					return;
				}

				if ( ! el.dataset.gtm_item_id ) {
					return;
				}

				let gtmData    = pluginGtmServerSide.getGtmItemData( el.dataset );
				let customData = pluginGtmServerSide.getCustomItemData( el.dataset );

				pluginGtmServerSide.pushAddToCart( gtmData );
				pluginGtmServerSide.pushSelectItem( gtmData, customData );
			}
		);

		jQuery( document ).on(
			'click',
			'.wc-block-grid__product .add_to_cart_button:not(.product_type_variable, .product_type_grouped, .single_add_to_cart_button)',
			function ( e ) {
				var $el = jQuery( this ).closest( '.wc-block-grid__product' );
				if ( ! $el.length ) {
					return;
				}

				if ( ! $el.data( 'gtm_item_id' ) ) {
					return;
				}

				let gtmData    = pluginGtmServerSide.getGtmItemData( $el.data() );
				let customData = pluginGtmServerSide.getCustomItemData( $el.data() );

				pluginGtmServerSide.pushAddToCart( gtmData );
				pluginGtmServerSide.pushSelectItem( gtmData, customData );
			}
		);

		jQuery( document ).on(
			'click',
			'.single_add_to_cart_button:not(.disabled)',
			function ( e ) {
				var $elForm = jQuery( this ).closest( 'form.cart' );
				if ( ! $elForm.length ) {
					return true;
				}

				if ( $elForm.find( '[name=variation_id]' ).length > 0 ) {
					pluginGtmServerSide.pushVariationProduct( $elForm );
					return;
				}

				if ( $elForm.hasClass( 'grouped_form' ) ) {
					pluginGtmServerSide.pushGroupProduct( $elForm );
					return;
				}

				pluginGtmServerSide.pushSimpleProduct( $elForm );
			}
		);

		/**
		 * Delete from minicart
		 */
		jQuery( document ).on(
			'removed_from_cart',
			function ( e, fragments, cart_hash, $thisbutton ) {
				if ( ! $thisbutton.length ) {
					return;
				}

				if ( ! $thisbutton.data( 'gtm_item_id' ) ) {
					return;
				}

				pluginGtmServerSide.removeFromCart(
					pluginGtmServerSide.getGtmItemData( $thisbutton.data() )
				);
			}
		);

		/**
		 * Delete from page: /cart
		 */
		jQuery( document ).on(
			'click',
			'.woocommerce-cart-form .product-remove > a',
			function ( e ) {
				var $el = jQuery( e.currentTarget );

				if ( ! $el.data( 'gtm_item_id' ) ) {
					return;
				}

				pluginGtmServerSide.removeFromCart(
					pluginGtmServerSide.getGtmItemData( $el.data() )
				);
			}
		);
	}
);

var pluginGtmServerSide = {
	pushSimpleProduct: function ( $elForm ) {
		var item = this.convertInputsToObject(
			$elForm.find( '[name^=gtm_]' )
		);
		item     = this.getGtmItemData( item );

		var $elQty = $elForm.find( '[name=quantity]' );
		if ( $elQty.length ) {
			item.quantity = $elQty.val();
		}

		this.pushAddToCart( item );
	},

	pushVariationProduct: function ( $elForm ) {
		var item = this.convertInputsToObject(
			$elForm.find( '[name^=gtm_]' )
		);
		item     = this.getGtmItemData( item );

		var $elQty = $elForm.find( '[name=quantity]' );
		if ( $elQty.length ) {
			item.quantity = $elQty.val();
		}

		var variations = [];
		$elForm.find( '[name^=attribute_] option:selected' ).each(
			function () {
				variations.push( jQuery( this ).text() );
			}
		);

		if ( variations.length ) {
			item.item_variant = variations.join( ',' );
		}

		this.pushAddToCart( item );
	},

	pushGroupProduct: function ( $elForm ) {
		var items = [];
		$elForm.find( '[name^=quantity\\[]' ).each(
			function () {
				if ( ! jQuery( this ).val() ) {
					return;
				}

				var $elTd = jQuery( this ).closest( 'td' );
				if ( ! $elTd.length ) {
					return;
				}

				var item = {
					quantity: jQuery( this ).val(),
				};
				$elTd.find( '[name^=gtm_]' ).each(
					function () {
						item[ jQuery( this ).data( 'name' ) ] = jQuery( this ).val();
					}
				);
				items.push( item );
			}
		);
		this.pushAddToCart( items );
	},

	/**
	 * Remove from cart
	 *
	 * @param object item
	 */
	removeFromCart: function ( item ) {
		item.quantity = item.quantity || 1;
		var eventData = {
			'event': this.getDataLayerEventName( 'remove_from_cart' ),
			'ecommerce': {
				'currency': varGtmServerSide.currency,
				'items': [
					item,
				],
			},
		};

		if ( varGtmServerSide.user_data ) {
			eventData.user_data = {};
			for ( var key in varGtmServerSide.user_data  ) {
				eventData.user_data[ key ] = varGtmServerSide.user_data[ key ];
			}
		}

		if ( 'yes' === varGtmServerSide.is_custom_event_name ) {
			this._pushWithStateCartData( eventData );

			return;
		}

		dataLayer.push( { ecommerce: null } );
		dataLayer.push( eventData );
	},

	/**
	 * Change product quantity in cart
	 */
	changeCartQty: function () {
		var $this = this;

		document.querySelectorAll( '.product-quantity input.qty' ).forEach(
			function ( el ) {
				var originalValue = el.defaultValue;

				var currentValue = parseInt( el.value );
				if ( isNaN( currentValue ) ) {
					currentValue = originalValue;
				}

				if ( originalValue != currentValue ) {
					var elCartItem = el.closest( '.cart_item' );
					var elDataset  = elCartItem && elCartItem.querySelector( '.remove' );
					if ( ! elDataset ) {
						return;
					}

					if ( originalValue < currentValue ) {
						var item         = $this.getGtmItemData( elDataset.dataset );
						item['quantity'] = currentValue - originalValue;

						$this.pushAddToCart( item );
					}
				}
			}
		);
	},

	/**
	 * Return gtm custom data.
	 *
	 * @param object items List items.
	 * @returns object
	 */
	getGtmItemData: function ( items ) {
		return this._getItemData( items, 'gtm_' );
	},

	/**
	 * Return gtm custom data.
	 *
	 * @param object items List items.
	 * @returns object
	 */
	getCustomItemData: function ( items ) {
		return this._getItemData( items, 'custom_gtm_' );
	},

	/**
	 * Return item data.
	 *
	 * @param object items List items.
	 * @returns object
	 */
	_getItemData: function ( items, prefix ) {
		var result = {};
		for ( var key in items ) {
			if ( 0 !== key.indexOf( prefix ) ) {
				continue;
			}

			var itemKey       = key.replace( prefix, '' )
			result[ itemKey ] = items[ key ];
		}
		return result;
	},

	/**
	 * Convert input elements to object.
	 *
	 * @param object $els Elements.
	 * @returns object
	 */
	convertInputsToObject( $els ) {
		var data = {};
		if ( ! $els.length ) {
			return data;
		}

		$els.each(
			function () {
				data[ jQuery( this ).attr( 'name' ) ] = jQuery( this ).val();
			}
		);
		return data;
	},

	/**
	 * Filter item price.
	 *
	 * @param object item List items.
	 * @returns object
	 */
	filterItemPrice: function ( item ) {
		if ( typeof item.price == 'string' ) {
			item.price = parseFloat( item.price );
			if ( isNaN( item.price ) ) {
				item.price = 0;
			}
		} else if ( typeof item.price != 'number' ) {
			item.price = 0;
		}
		item.price = item.price.toFixed( 2 );

		return item;
	},

	/**
	 * Push add_to_cart to dataLayer.
	 *
	 * @param mixed item List items.
	 */
	pushAddToCart: function ( item ) {
		this._pushToDataLayer( item, 'add_to_cart', 'product' )
	},

	/**
	 * Push add_to_cart to dataLayer.
	 *
	 * @param object item List items.
	 * @param object custom Custom data.
	 */
	pushSelectItem: function ( item, custom ) {
		if ( custom?.pagetype ) { // phpcs:ignore WordPress.WhiteSpace.OperatorSpacing.NoSpaceBefore, WordPress.WhiteSpace.OperatorSpacing.NoSpaceAfter
			this._pushToDataLayer(
				item,
				'select_item',
				custom.pagetype,
				{
					collection_id:  custom?.collection_id,  // phpcs:ignore WordPress.WhiteSpace.OperatorSpacing.NoSpaceBefore, WordPress.WhiteSpace.OperatorSpacing.NoSpaceAfter
					item_list_name: custom?.item_list_name, // phpcs:ignore WordPress.WhiteSpace.OperatorSpacing.NoSpaceBefore, WordPress.WhiteSpace.OperatorSpacing.NoSpaceAfter
				}
			)
		}
	},

	/**
	 * Push to dataLayer.
	 *
	 * @param object originalItem List items.
	 * @param string event Event name.
	 * @param string pagetype Page type name.
	 * @param object customEcommerce Ecommerce data.
	 */
	_pushToDataLayer: function ( originalItem, event, pagetype, customEcommerce = {} ) {
		item = Object.assign( {}, originalItem );
		if ( item.item_id ) {
			item = [ item ];
		}

		var items = [];
		var value = 0;
		var index = 1;
		for ( var item_loop of item ) {
			item_loop.index    = index++;
			item_loop.quantity = item_loop.quantity ? parseInt( item_loop.quantity, 10 ) : 1;
			item_loop          = this.filterItemPrice( item_loop );
			value              = parseFloat( value + ( item_loop.price * item_loop.quantity ) );
			items.push( item_loop );
		}

		let eventDataEcommerce = {
			'currency': varGtmServerSide.currency,
			'value': value.toFixed( 2 ),
			'items': items,
		}

		var eventData = {
			'event':          this.getDataLayerEventName( event ),
			'ecomm_pagetype': pagetype,
			'ecommerce': Object.assign( {}, eventDataEcommerce, customEcommerce ),
		};
		if ( varGtmServerSide.user_data ) {
			eventData.user_data = {};
			for ( var key in varGtmServerSide.user_data  ) {
				eventData.user_data[ key ] = varGtmServerSide.user_data[ key ];
			}
		}

		if ( 'add_to_cart' === event && 'yes' === varGtmServerSide.is_custom_event_name ) {
			this._pushWithStateCartData( eventData );

			return;
		}

		dataLayer.push( { ecommerce: null } );
		dataLayer.push( eventData );
	},

	/**
	 * Return data layer event name.
	 *
	 * @param  string $event_name Event name.
	 * @return string
	 */
	getDataLayerEventName: function( event_name ) {
		if ( 'yes' === varGtmServerSide.is_custom_event_name ) {
			return event_name + varGtmServerSide.DATA_LAYER_CUSTOM_EVENT_NAME;
		}
		return event_name;
	},

	/**
	 * Internal helper: actually performs the AJAX request and pushes to the dataLayer.
	 *
	 * @param {object} eventData eventData object.
	 * @return {void}
	 */
	_sendStateCartDataAjax: function( eventData ) {
		jQuery.post(
			varGtmServerSide.ajax,
			{
				action: 'gtm_server_side_state_cart_data',
				security: varGtmServerSide.security,
			},
			function ( response ) {
				if ( ! response || ! response.success ) {
					dataLayer.push( { ecommerce: null } );
					dataLayer.push( eventData );

					return false;
				}

				eventData['cart_state'] = response.data;

				dataLayer.push( { ecommerce: null } );
				dataLayer.push( eventData );
			}
		);
	},

	/**
	 * Push dataLayer with state cart data
	 *
	 * @param {object} eventData Event data object.
	 * @return {void}
	 */
	_pushWithStateCartData: function( eventData ) {
		let self  = this;
		let fired = false;

		var handler = function( event, xhr, settings ) {
			if ( fired ) {
				return;
			}

			if ( ! settings || ! settings.url ) {
				return;
			}

			let url = settings.url;

			if (
				url.indexOf( 'wc-ajax=add_to_cart' ) !== -1 ||
				url.indexOf( 'wc-ajax=remove_from_cart' ) !== -1
			) {
				fired = true;

				jQuery( document ).off( 'ajaxComplete', handler );

				self._sendStateCartDataAjax( eventData );
			}
		};

		jQuery( document ).on( 'ajaxComplete', handler );

		setTimeout(
			function() {
				if ( fired ) {
					return;
				}

				jQuery( document ).off( 'ajaxComplete', handler );
				self._sendStateCartDataAjax( eventData );
			},
			1500
		);
	}
};
