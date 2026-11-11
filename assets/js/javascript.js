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
				var el = e.currentTarget || e.target.closest( '.add_to_cart_button' );
				if ( ! el || ! el.dataset ) {
					return;
				}

				if ( ! el.dataset.gtm_item_id ) {
					return;
				}

				let gtmData    = pluginGtmServerSide.getGtmItemData( el.dataset );
				let customData = pluginGtmServerSide.getCustomItemData( el.dataset );

				pluginGtmServerSide.trackAddToCart( gtmData, this );
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

				pluginGtmServerSide.trackAddToCart( gtmData, this );
				pluginGtmServerSide.pushSelectItem( gtmData, customData );
			}
		);

		jQuery( document ).on(
			'click',
			'.single_add_to_cart_button:not(.disabled)',
			function ( e ) {
				// The "Add to Cart with Options" block's form has the `cart` class
				// only in its legacy (page-load) mode; otherwise it adds through
				// the Store API.
				var $elForm = jQuery( this ).closest( 'form.cart, form.wc-block-add-to-cart-with-options' );
				if ( ! $elForm.length ) {
					return true;
				}

				if ( $elForm.find( '[name=variation_id]' ).length > 0 ) {
					pluginGtmServerSide.pushVariationProduct( $elForm, this );
					return;
				}

				if ( $elForm.hasClass( 'grouped_form' ) || $elForm.find( '[name^=quantity\\[]' ).length > 0 ) {
					pluginGtmServerSide.pushGroupProduct( $elForm, this );
					return;
				}

				pluginGtmServerSide.pushSimpleProduct( $elForm, this );
			}
		);

		/**
		 * The shopper changed an option of a variable product. WooCommerce has
		 * already matched the variation for an inline form, so the decision
		 * waits for found_variation's own tick to end (see
		 * onFoundVariation()).
		 */
		jQuery( document ).on(
			'woocommerce_variation_has_changed',
			'.variations_form',
			function () {
				jQuery( this ).data( 'gtm_variation_changed', true );
			}
		);

		jQuery( document ).on(
			'found_variation',
			'.variations_form',
			function ( e, variation ) {
				pluginGtmServerSide.rememberFoundVariation( jQuery( this ), variation );
				pluginGtmServerSide.onFoundVariation( jQuery( this ), variation );
			}
		);

		/**
		 * Add over AJAX without WooCommerce's own handler: a theme or plugin that
		 * AJAX-ifies an add-to-cart link or form.cart posts it and then triggers
		 * added_to_cart to refresh the fragments. The click left the item pending;
		 * this is where it is pushed, because no page render follows to drain the
		 * server-side stash.
		 */
		jQuery( document.body ).on(
			'added_to_cart',
			function () {
				pluginGtmServerSide.flushPendingAddToCart();
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
					pluginGtmServerSide.getGtmItemData( $thisbutton.get( 0 ).dataset )
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
					pluginGtmServerSide.getGtmItemData( e.currentTarget.dataset )
				);
			}
		);
	}
);

var pluginGtmServerSide = {
	/**
	 * The cart lines the Store API last sent, by cart item key:
	 * { quantity, item }, item being the plugin's item for the line. null until
	 * a cart has been seen. See observeStoreApi().
	 */
	storeApiCartLines: null,

	/**
	 * Add built at click time that has not been pushed yet, with the moment it
	 * was built. See trackAddToCart().
	 */
	pendingAddToCart: null,

	/**
	 * How long a pending add stays eligible for its added_to_cart, in ms.
	 *
	 * A click that neither loads a page nor completes an AJAX add (a failed
	 * validation, an aborted request) would otherwise leave its item behind and
	 * see it pushed by an unrelated add later on.
	 */
	PENDING_ADD_TO_CART_MAX_AGE: 30000,

	/**
	 * Cookie holding the token of the add the server stashed last.
	 *
	 * See GTM_Server_Side_Event_AddToCart::TOKEN_COOKIE.
	 */
	ADD_TO_CART_TOKEN_COOKIE: 'gtm_server_side_add_to_cart',

	/**
	 * Push an add_to_cart for a click, or hold it until the add lands.
	 *
	 * The item is held only when the click is expected to load a page: there
	 * the click-time push is lost and GTM_Server_Side_Event_AddToCart emits the
	 * event on the next render instead, and a pending item dies with the page.
	 * If a theme or plugin AJAX-ifies that link or form, added_to_cart pushes
	 * the held item. Every other add — WooCommerce's own AJAX handler, or a
	 * WooCommerce Blocks button adding through the Store API, which triggers no
	 * added_to_cart — is pushed at click time; the server stashes nothing for
	 * an AJAX or Store API add, so the push is the only one.
	 *
	 * @param object|array item Item or list of items.
	 * @param element el Clicked element.
	 */
	trackAddToCart: function ( item, el ) {
		if ( this.isAjaxAddToCart( el ) || ! this.isPageLoadAddToCart( el ) ) {
			this.pendingAddToCart = null;
			this.pushAddToCart( item );

			return;
		}

		this.pendingAddToCart = {
			item: item,
			time: Date.now(),
		};
	},

	/**
	 * Push the add held by trackAddToCart(), if there is still one to push.
	 *
	 * The add was posted as if it loaded a page, so the server may have stashed
	 * it too. Once the push is in dataLayer, the token cookie is deleted so the
	 * next render does not push it again; until then, leaving the page keeps
	 * the server-side push as the fallback.
	 */
	flushPendingAddToCart: function () {
		var self              = this;
		var pending           = this.pendingAddToCart;
		this.pendingAddToCart = null;

		if ( ! pending ) {
			return;
		}

		if ( ( Date.now() - pending.time ) > this.PENDING_ADD_TO_CART_MAX_AGE ) {
			return;
		}

		this.pushAddToCart(
			pending.item,
			function () {
				document.cookie = self.ADD_TO_CART_TOKEN_COOKIE + '=; max-age=-1; path=/';
			}
		);
	},

	/**
	 * Whether the clicked control adds the product over AJAX.
	 *
	 * This reproduces the condition WooCommerce's own `wc-add-to-cart.js`
	 * applies before it takes a click over AJAX, so the answer follows the
	 * handler that is actually present rather than a class name alone:
	 *
	 * - the script is enqueued. "Enable AJAX add to cart buttons on archives"
	 *   is what decides that, and the script localises `wc_add_to_cart_params`,
	 *   so the global is present exactly when the handler is;
	 * - the clicked control itself carries `ajax_add_to_cart` (the class is set
	 *   from the product's own `ajax_add_to_cart` support, independently of the
	 *   option, so it is not sufficient on its own);
	 * - it carries `data-product_id`, which the handler posts.
	 *
	 * @param element el Clicked element.
	 * @returns bool
	 */
	isAjaxAddToCart: function ( el ) {
		if ( 'undefined' === typeof wc_add_to_cart_params ) {
			return false;
		}

		var $el = jQuery( el );

		return $el.is( '.ajax_add_to_cart' ) && !! $el.attr( 'data-product_id' );
	},

	/**
	 * Whether the clicked control is expected to add the product by loading a
	 * page.
	 *
	 * That is a submit of the product's `form.cart`, or a link that goes
	 * somewhere, such as the plain `?add-to-cart=` link on archives with AJAX
	 * off. A WooCommerce Blocks product button is a `<button>` outside any
	 * form, so it does not qualify.
	 *
	 * @param element el Clicked element.
	 * @returns bool
	 */
	isPageLoadAddToCart: function ( el ) {
		var $el = jQuery( el );

		if ( $el.closest( 'form.cart' ).length ) {
			return true;
		}

		if ( ! $el.is( 'a' ) ) {
			return false;
		}

		var href = $el.attr( 'href' );

		if ( ! href || 0 === href.indexOf( '#' ) ) {
			return false;
		}

		try {
			var protocol = new URL( href, window.location.href ).protocol;

			return 'http:' === protocol || 'https:' === protocol;
		} catch ( e ) {
			return false;
		}
	},

	pushSimpleProduct: function ( $elForm, el ) {
		var item = this.convertInputsToObject(
			$elForm.find( '[name^=gtm_]' )
		);
		item     = this.getGtmItemData( item );

		var $elQty = $elForm.find( '[name=quantity]' );
		if ( $elQty.length ) {
			item.quantity = $elQty.val();
		}

		this.trackAddToCart( item, el );
	},

	pushVariationProduct: function ( $elForm, el ) {
		var item = this.getFoundVariationItem( $elForm ) || this.getGtmItemData(
			this.convertInputsToObject( $elForm.find( '[name^=gtm_]' ) )
		);

		var $elQty = $elForm.find( '[name=quantity]' );
		if ( $elQty.length ) {
			item.quantity = $elQty.val();
		}

		var itemVariant = this.getChosenVariant( $elForm );
		if ( itemVariant ) {
			item.item_variant = itemVariant;
		}

		this.trackAddToCart( item, el );
	},

	/**
	 * Keep the variation WooCommerce found for a form, with its item from
	 * GTM_Server_Side_Event_ViewItem::woocommerce_available_variation().
	 *
	 * @param object $elForm Variations form.
	 * @param object variation Variation data.
	 */
	rememberFoundVariation: function ( $elForm, variation ) {
		if ( variation && variation.gtm_item ) {
			$elForm.data( 'gtm_found_variation', variation );
		}
	},

	/**
	 * The item of the variation the form holds now, if it is the one found
	 * last. The form's gtm_* inputs describe the parent product.
	 *
	 * @param object $elForm Variations form.
	 * @returns object|null
	 */
	getFoundVariationItem: function ( $elForm ) {
		var variation   = $elForm.data( 'gtm_found_variation' );
		var variationId = $elForm.find( '[name=variation_id]' ).val();

		if ( ! variation || String( variation.variation_id ) !== String( variationId ) ) {
			return null;
		}

		return Object.assign( {}, variation.gtm_item );
	},

	/**
	 * The options chosen in a variable product's form, as item_variant.
	 *
	 * @param object $elForm Form.
	 * @returns string
	 */
	getChosenVariant: function ( $elForm ) {
		var variations = [];
		$elForm.find( '[name^=attribute_] option:selected' ).each(
			function () {
				variations.push( jQuery( this ).text() );
			}
		);

		return variations.join( ',' );
	},

	/**
	 * Push view_item for the variation the shopper picked.
	 *
	 * WooCommerce also finds a variation when the page opens with default
	 * options, before the shopper did anything; the page's own view_item
	 * covers that view, so only a variation found after an option changed
	 * counts. WooCommerce marks the change right after it finds the variation
	 * of an inline form, hence the deferral. Finding the variation pushed last
	 * again (a select re-set to the same value, a clear and the same choice)
	 * pushes nothing.
	 *
	 * @param object $elForm Variations form.
	 * @param object variation Variation data, with the item from
	 *                         GTM_Server_Side_Event_ViewItem::woocommerce_available_variation().
	 */
	onFoundVariation: function ( $elForm, variation ) {
		var self = this;

		if ( ! variation || ! variation.gtm_item ) {
			return;
		}

		// A product page only: a variation form elsewhere (a quick view in a
		// grid) is not the view the event reports as ecomm_pagetype product.
		if ( ! jQuery( document.body ).hasClass( 'single-product' ) ) {
			return;
		}

		setTimeout(
			function () {
				if ( ! $elForm.data( 'gtm_variation_changed' ) ) {
					return;
				}

				if ( $elForm.data( 'gtm_viewed_variation_id' ) === variation.variation_id ) {
					return;
				}
				$elForm.data( 'gtm_viewed_variation_id', variation.variation_id );

				var item        = Object.assign( {}, variation.gtm_item );
				var itemVariant = self.getChosenVariant( $elForm );
				if ( itemVariant ) {
					item.item_variant = itemVariant;
				}

				self.pushViewItem( item );
			},
			0
		);
	},

	/**
	 * Push view_item, shaped as GTM_Server_Side_Event_ViewItem prints it.
	 *
	 * @param object item Item.
	 */
	pushViewItem: function ( item ) {
		var eventData = {
			'event':          this.getDataLayerEventName( 'view_item' ),
			'ecomm_pagetype': 'product',
			'ecommerce': {
				'currency': varGtmServerSide.currency,
				'value':    item.price,
				'items':    [ item ],
			},
		};

		if ( varGtmServerSide.user_data ) {
			eventData.user_data = {};
			for ( var key in varGtmServerSide.user_data  ) {
				eventData.user_data[ key ] = varGtmServerSide.user_data[ key ];
			}
		}

		if ( 'yes' === varGtmServerSide.is_custom_event_name ) {
			this._sendStateCartDataAjax( eventData );

			return;
		}

		this._pushDataLayerEvent( eventData );
	},

	pushGroupProduct: function ( $elForm, el ) {
		var items = [];
		$elForm.find( '[name^=quantity\\[]' ).each(
			function () {
				var $elQty = jQuery( this );
				if ( $elQty.is( ':checkbox' ) && ! $elQty.is( ':checked' ) ) {
					return;
				}

				if ( ! ( parseFloat( $elQty.val() ) > 0 ) ) {
					return;
				}

				var match = /^quantity\[(\d+)\]$/.exec( $elQty.attr( 'name' ) );
				if ( ! match ) {
					return;
				}

				var item = {
					quantity: $elQty.val(),
				};
				$elForm.find( '[name^=gtm_][name$="[' + match[1] + ']"]' ).each(
					function () {
						item[ jQuery( this ).data( 'name' ) ] = jQuery( this ).val();
					}
				);
				items.push( item );
			}
		);
		this.trackAddToCart( items, el );
	},

	/**
	 * Remove from cart
	 *
	 * @param object item
	 */
	removeFromCart: function ( item ) {
		item.index    = 1;
		item.quantity = parseInt( item.quantity, 10 ) || 1;
		var eventData = {
			'event': this.getDataLayerEventName( 'remove_from_cart' ),
			'ecommerce': {
				'currency': varGtmServerSide.currency,
				'value': this.getItemValue( item ),
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

		this._pushDataLayerEvent( eventData );
	},

	/**
	 * Watch the Store API for the Cart and Mini-Cart blocks' remove and
	 * quantity changes.
	 *
	 * The blocks post `cart/update-item` and `cart/remove-item` (on their own
	 * or inside a `batch`) and get the whole cart back. The event is the
	 * difference between that cart and the one last seen: an increase is an
	 * add_to_cart, a decrease or a remove is a remove_from_cart, each for the
	 * quantity that changed. Every cart the page receives, the blocks' own
	 * cart loads included, replaces the lines last seen, so a line's baseline
	 * is always what the server last said. A product button posts `add-item`,
	 * which the click already pushed, so it only refreshes the lines.
	 */
	observeStoreApi: function () {
		var self     = this;
		var original = window.fetch;

		window.fetch = function ( input, init ) {
			var promise = original.apply( this, arguments );

			try {
				self.trackStoreApiCall( input, init, promise );
			} catch ( e ) {
				// Tracking must not change what the caller gets back.
			}

			return promise;
		};
	},

	/**
	 * Read a fetch() call and, once answered, track the cart it returns.
	 *
	 * @param mixed input What fetch() was given: a URL or a Request.
	 * @param object init fetch() options.
	 * @param Promise promise The caller's response promise, left untouched.
	 */
	trackStoreApiCall: function ( input, init, promise ) {
		var isRequest = input && 'object' === typeof input && 'string' === typeof input.url;
		var route     = this.getStoreApiRoute( isRequest ? input.url : String( input ) );
		if ( ! route ) {
			return;
		}

		if ( null === this.storeApiCartLines ) {
			this.storeApiCartLines = this.getPreloadedStoreApiCartLines();
		}

		var self = this;
		// Both blocks pass the body as a JSON string in init.
		var request = {
			route: route,
			body: init && 'string' === typeof init.body ? this.parseJson( init.body ) : null,
		};

		promise.then(
			function ( response ) {
				return response.ok ? response.clone().json() : null;
			}
		).then(
			function ( response ) {
				self.trackStoreApiResponse( request, response );
			}
		).catch(
			function () {
				// A response that is not JSON, or a failed request: nothing to track.
			}
		);
	},

	/**
	 * Track a Store API response, or each 2xx sub-response of a batch.
	 *
	 * @param object request { route, body }.
	 * @param object response Decoded response body.
	 */
	trackStoreApiResponse: function ( request, response ) {
		if ( 'batch' !== request.route ) {
			this.trackStoreApiCart( request, response );

			return;
		}

		var requests  = ( request.body && request.body.requests ) || [];
		var responses = ( response && response.responses ) || [];
		for ( var i = 0; i < requests.length; i++ ) {
			var sub = responses[ i ];
			if ( ! sub || sub.status < 200 || sub.status >= 300 ) {
				continue;
			}

			this.trackStoreApiCart(
				{
					route: this.getStoreApiRoute( requests[ i ].path || '' ),
					body: requests[ i ].body,
				},
				sub.body
			);
		}
	},

	/**
	 * Push what a cart line change did and remember the cart that came back.
	 *
	 * @param object request { route, body }.
	 * @param object cart Store API cart.
	 */
	trackStoreApiCart: function ( request, cart ) {
		if ( ! cart || ! Array.isArray( cart.items ) ) {
			return;
		}

		var key  = request.body && request.body.key;
		var line = key && this.storeApiCartLines && this.storeApiCartLines[ key ];

		if ( line && 'cart/update-item' === request.route ) {
			var next     = cart.items.find( function ( cartItem ) {
				return cartItem.key === key;
			} );
			var quantity = next ? parseInt( next.quantity, 10 ) : 0;
			var delta    = quantity - line.quantity;
			var item     = Object.assign( {}, line.item );

			if ( delta > 0 ) {
				item.quantity = delta;
				this.pushAddToCart( item );
			} else if ( delta < 0 ) {
				item.quantity = -delta;
				this.removeFromCart( item );
			}
		} else if ( line && 'cart/remove-item' === request.route ) {
			var removed = Object.assign( { quantity: line.quantity }, line.item );
			this.removeFromCart( removed );
		}

		this.storeApiCartLines = this.getStoreApiCartLines( cart );
	},

	/**
	 * An item's price x quantity, formatted as every event's ecommerce.value.
	 *
	 * @param object item Item with price and quantity.
	 * @returns string
	 */
	getItemValue: function ( item ) {
		return ( ( parseFloat( item.price ) || 0 ) * item.quantity ).toFixed( 2 );
	},

	/**
	 * The cart the Cart block was rendered with, for a page where no cart
	 * has been fetched yet: the block hydrates its data store from the page
	 * instead of loading the cart.
	 *
	 * @returns object|null The lines, or null when the page has no such cart.
	 */
	getPreloadedStoreApiCartLines: function () {
		try {
			var cart = window.wp.data.select( 'wc/store/cart' ).getCartData();
			if ( ! Array.isArray( cart.items ) || ! cart.items.some( this.hasStoreApiCartItemData ) ) {
				return null;
			}

			return this.getStoreApiCartLines( cart );
		} catch ( e ) {
			return null;
		}
	},

	/**
	 * The lines of a Store API cart, by cart item key.
	 *
	 * @param object cart Store API cart.
	 * @returns object
	 */
	getStoreApiCartLines: function ( cart ) {
		var lines = {};
		for ( var cartItem of cart.items ) {
			if ( ! cartItem.key || ! this.hasStoreApiCartItemData( cartItem ) ) {
				continue;
			}

			lines[ cartItem.key ] = {
				quantity: parseInt( cartItem.quantity, 10 ) || 0,
				item: this.getStoreApiCartItem( cartItem ),
			};
		}

		return lines;
	},

	/**
	 * Whether the server put the plugin's item data on a Store API cart item.
	 *
	 * @param object cartItem Store API cart item.
	 * @returns bool
	 */
	hasStoreApiCartItemData: function ( cartItem ) {
		var data = cartItem && cartItem.extensions && cartItem.extensions.gtm_server_side;

		return !! ( data && data.item );
	},

	/**
	 * Copy of the item data the server put on a Store API cart item.
	 *
	 * The server runs the item through the filters that build the classic
	 * remove link's data attributes, so its keys are attribute names
	 * (image-url). They are camel-cased as the browser's dataset does for the
	 * classic link (imageUrl), to keep the payload identical.
	 *
	 * @param object cartItem Store API cart item.
	 * @returns object
	 */
	getStoreApiCartItem: function ( cartItem ) {
		var data = cartItem.extensions.gtm_server_side.item;
		var item = {};
		for ( var key in data ) {
			item[ key.replace( /-([a-z])/g, function ( m, c ) {
				return c.toUpperCase();
			} ) ] = data[ key ];
		}

		return item;
	},

	/**
	 * The Store API route of a URL, without its version: `cart/update-item`,
	 * `batch`. Covers pretty permalinks and the `rest_route` query of plain
	 * ones.
	 *
	 * @param string url URL or path.
	 * @returns string|null null for a URL outside the Store API.
	 */
	getStoreApiRoute: function ( url ) {
		var path;
		try {
			var parsed = new URL( url, window.location.href );
			path       = parsed.searchParams.get( 'rest_route' ) || parsed.pathname;
		} catch ( e ) {
			return null;
		}

		var match = /\/wc\/store(?:\/v\d+)?\/(.+?)\/?$/.exec( path );

		return match ? match[1] : null;
	},

	/**
	 * Decode JSON, or null when it is not JSON.
	 *
	 * @param string text JSON text.
	 * @returns mixed
	 */
	parseJson: function ( text ) {
		try {
			return JSON.parse( text );
		} catch ( e ) {
			return null;
		}
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
	 * @param function onPushed Called once the event is in dataLayer.
	 */
	pushAddToCart: function ( item, onPushed ) {
		this._pushToDataLayer( item, 'add_to_cart', 'product', {}, onPushed )
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
	 * @param object|array originalItem Single item or list of items.
	 * @param string event Event name.
	 * @param string pagetype Page type name.
	 * @param object customEcommerce Ecommerce data.
	 * @param function onPushed Called once the event is in dataLayer.
	 */
	_pushToDataLayer: function ( originalItem, event, pagetype, customEcommerce = {}, onPushed ) {
		var originalItems = Array.isArray( originalItem ) ? originalItem : [ originalItem ];

		var items = [];
		var value = 0;
		var index = 1;
		for ( var original of originalItems ) {
			var item_loop      = Object.assign( {}, original );
			item_loop.index    = index++;
			item_loop.quantity = item_loop.quantity ? parseInt( item_loop.quantity, 10 ) : 1;
			item_loop          = this.filterItemPrice( item_loop );
			value              = parseFloat( value + ( item_loop.price * item_loop.quantity ) );
			items.push( item_loop );
		}

		if ( ! items.length ) {
			return;
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
			this._pushWithStateCartData( eventData, onPushed );

			return;
		}

		this._pushDataLayerEvent( eventData );

		if ( onPushed ) {
			onPushed();
		}
	},

	/**
	 * Push a data layer event, after clearing the previous ecommerce object.
	 *
	 * Only a GTM snippet creates dataLayer, and none is printed with placement
	 * "Disable" or for an excluded role, so the push creates it if missing: a
	 * GTM loaded later reads what is already there.
	 *
	 * @param object eventData Event.
	 */
	_pushDataLayerEvent: function ( eventData ) {
		window.dataLayer = window.dataLayer || [];
		window.dataLayer.push( { ecommerce: null } );
		window.dataLayer.push( eventData );
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
	 * @param {function} onPushed Called once the event is in dataLayer.
	 * @return {void}
	 */
	_sendStateCartDataAjax: function( eventData, onPushed ) {
		jQuery.post(
			varGtmServerSide.ajax,
			{
				action: 'gtm_server_side_state_cart_data',
				security: varGtmServerSide.security,
			},
			function ( response ) {
				if ( response && response.success ) {
					eventData['cart_state'] = response.data;
				}

				pluginGtmServerSide._pushDataLayerEvent( eventData );

				if ( onPushed ) {
					onPushed();
				}
			}
		);
	},

	/**
	 * Push dataLayer with state cart data
	 *
	 * @param {object} eventData Event data object.
	 * @param {function} onPushed Called once the event is in dataLayer.
	 * @return {void}
	 */
	_pushWithStateCartData: function( eventData, onPushed ) {
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

				self._sendStateCartDataAjax( eventData, onPushed );
			}
		};

		jQuery( document ).on( 'ajaxComplete', handler );

		setTimeout(
			function() {
				if ( fired ) {
					return;
				}

				jQuery( document ).off( 'ajaxComplete', handler );
				self._sendStateCartDataAjax( eventData, onPushed );
			},
			1500
		);
	}
};

/**
 * Cart and Mini-Cart blocks: they render no remove link and post their changes
 * to the Store API, so the cart they get back is the only signal. Watched from
 * here, not on ready: the Mini-Cart is a script module, which runs before
 * ready and loads the cart as it starts, and that load is the first baseline.
 */
pluginGtmServerSide.observeStoreApi();
