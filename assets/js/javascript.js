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

				pluginGtmServerSide.pushAddToCart(
					pluginGtmServerSide.removePrefixes( el.dataset )
				);
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

				pluginGtmServerSide.pushAddToCart(
					pluginGtmServerSide.removePrefixes( $el.data() )
				);
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
				if ( ! $thisbutton.data( 'gtm_item_id' ) ) {
					return;
				}

				pluginGtmServerSide.removeFromCart(
					pluginGtmServerSide.removePrefixes( $thisbutton.data() )
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
				e.preventDefault();

				var $el = jQuery( e.currentTarget );

				if ( ! $el.data( 'gtm_item_id' ) ) {
					return;
				}

				pluginGtmServerSide.removeFromCart(
					pluginGtmServerSide.removePrefixes( $el.data() )
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
		item     = this.removePrefixes( item );

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
		item     = this.removePrefixes( item );

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
			'event': 'remove_from_cart',
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
						var item         = $this.removePrefixes( elDataset.dataset );
						item['quantity'] = currentValue - originalValue;

						$this.pushAddToCart( item );
					}
				}
			}
		);
	},

	/**
	 * Remove field prefixes.
	 *
	 * @param object items List items.
	 * @returns object
	 */
	removePrefixes: function ( items ) {
		var item = {};
		for ( var key in items ) {
			if ( 0 !== key.indexOf( 'gtm_' ) ) {
				continue;
			}

			var itemKey     = key.replace( 'gtm_', '' )
			item[ itemKey ] = items[key];
		}
		return item;
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

		var eventData = {
			'event': 'add_to_cart',
			'ecommerce': {
				'currency': varGtmServerSide.currency,
				'value': value.toFixed( 2 ),
				'items': items,
			},
		};
		if ( varGtmServerSide.user_data ) {
			eventData.user_data = {};
			for ( var key in varGtmServerSide.user_data  ) {
				eventData.user_data[ key ] = varGtmServerSide.user_data[ key ];
			}
		}
		dataLayer.push( eventData );
	}
};
