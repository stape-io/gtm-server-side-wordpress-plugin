/**
 * Verifies trackAddToCart()'s hold-vs-push decision (DEV-12446) by running the
 * real assets/js/javascript.js in a sandbox, against fake elements shaped like
 * the markup each add-to-cart path actually produces.
 *
 * A real jQuery/DOM is not available in this sandbox (no WordPress, no
 * browser), so this stands in a minimal jQuery shim implementing only the
 * handful of calls trackAddToCart(), isAjaxAddToCart() and
 * isPageLoadAddToCart() actually make: is(), attr(), closest(). Every other
 * jQuery entry point used at file load time (on(), ready(), find(), data(),
 * hasClass()) is a no-op, since the click bindings themselves are not what is
 * under test here.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';
import { describe, it, expect, beforeEach } from 'vitest';

const __dirname = path.dirname( fileURLToPath( import.meta.url ) );
const SOURCE = fs.readFileSync( path.join( __dirname, '../js/javascript.js' ), 'utf8' );

function makeElement( { tag = 'button', classes = [], attrs = {}, inFormCart = false } = {} ) {
	return { __isElement: true, tag, classes, attrs, inFormCart };
}

function genericWrapper() {
	return {
		length: 0,
		ready( fn ) {
			fn();
			return this;
		},
		on() {
			return this;
		},
		off() {
			return this;
		},
		is() {
			return false;
		},
		attr() {
			return undefined;
		},
		closest() {
			return genericWrapper();
		},
		data() {
			return undefined;
		},
		find() {
			return genericWrapper();
		},
		hasClass() {
			return false;
		},
	};
}

function wrapElement( el ) {
	return {
		length: 1,
		0: el,
		is( sel ) {
			if ( 'a' === sel ) {
				return 'a' === el.tag;
			}
			if ( sel.charAt( 0 ) === '.' ) {
				return el.classes.indexOf( sel.slice( 1 ) ) !== -1;
			}
			return false;
		},
		attr( name ) {
			return Object.prototype.hasOwnProperty.call( el.attrs, name ) ? el.attrs[ name ] : undefined;
		},
		closest( sel ) {
			if ( 'form.cart' === sel && el.inFormCart ) {
				return wrapElement( makeElement( { tag: 'form' } ) );
			}
			return genericWrapper();
		},
		data() {
			return undefined;
		},
		find() {
			return genericWrapper();
		},
		hasClass() {
			return false;
		},
		on() {
			return this;
		},
	};
}

function jQueryShim( arg ) {
	if ( 'function' === typeof arg ) {
		arg();
		return undefined;
	}
	if ( arg && arg.__isElement ) {
		return wrapElement( arg );
	}
	return genericWrapper();
}

/**
 * Loads a fresh copy of javascript.js into its own sandbox, so each test gets
 * a clean pendingAddToCart and dataLayer, exactly like a fresh page load.
 */
function loadPlugin( { ajaxAddToCart = false, customEventName = false } = {} ) {
	const timers  = [];
	const posts   = [];
	const jQuery  = Object.assign(
		( arg ) => jQueryShim( arg ),
		{
			post( url, data, callback ) {
				posts.push( callback );
			},
		}
	);
	const sandbox = {
		jQuery,
		document: { body: { __isElement: false }, cookie: '' },
		dataLayer: [],
		varGtmServerSide: {
			currency: 'USD',
			is_custom_event_name: customEventName ? 'yes' : 'no',
			DATA_LAYER_CUSTOM_EVENT_NAME: '_stape',
			user_data: false,
		},
		console,
		URL,
		Date,
		location: { href: 'https://shop.test/shop/' },
		setTimeout( fn ) {
			timers.push( fn );
		},
		runTimers() {
			timers.splice( 0 ).forEach( ( fn ) => fn() );
		},
		respondToPosts( response ) {
			posts.splice( 0 ).forEach( ( fn ) => fn( response ) );
		},
	};
	if ( ajaxAddToCart ) {
		sandbox.wc_add_to_cart_params = {};
	}
	// As in a browser, window is the global object: window.dataLayer and a
	// bare dataLayer are one array.
	sandbox.window = sandbox;
	vm.createContext( sandbox );
	vm.runInContext( SOURCE, sandbox, { filename: 'javascript.js' } );
	return sandbox;
}

describe( 'trackAddToCart() hold-vs-push (DEV-12446)', () => {
	let sandbox;

	beforeEach( () => {
		sandbox = loadPlugin();
	} );

	it( 'AC1: pushes immediately for a WooCommerce Blocks button (no form, no href, no AJAX params)', () => {
		const el = makeElement( { tag: 'button', classes: [ 'wp-block-woocommerce-product-button' ] } );

		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '1' }, el );

		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );
		expect( sandbox.pluginGtmServerSide.pendingAddToCart ).toBeNull();
	} );

	it( 'AC2: holds the item for a plain archive add-to-cart link (real href, AJAX off)', () => {
		const el = makeElement( { tag: 'a', attrs: { href: '?add-to-cart=123' } } );

		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '2' }, el );

		expect( sandbox.dataLayer ).toHaveLength( 0 );
		expect( sandbox.pluginGtmServerSide.pendingAddToCart ).not.toBeNull();
		expect( sandbox.pluginGtmServerSide.pendingAddToCart.item ).toEqual( { item_id: '2' } );
	} );

	it( 'AC2: holds the item for a form.cart submit on the single-product page', () => {
		const el = makeElement( { tag: 'button', classes: [ 'single_add_to_cart_button' ], inFormCart: true } );

		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '3' }, el );

		expect( sandbox.dataLayer ).toHaveLength( 0 );
		expect( sandbox.pluginGtmServerSide.pendingAddToCart ).not.toBeNull();
	} );

	it( 'AC2: does not hold for a hash/js link outside a form (not a real navigation)', () => {
		const el = makeElement( { tag: 'a', attrs: { href: '#' } } );

		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '4' }, el );

		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );
		expect( sandbox.pluginGtmServerSide.pendingAddToCart ).toBeNull();
	} );

	it.each( [
		'javascript:void(0)',
		' JavaScript:void(0)',
		'data:text/html,x',
		'vbscript:x',
	] )( 'does not hold for a non-http(s) link outside a form (%s)', ( href ) => {
		const el = makeElement( { tag: 'a', attrs: { href } } );

		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '4' }, el );

		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );
		expect( sandbox.pluginGtmServerSide.pendingAddToCart ).toBeNull();
	} );

	it( 'AC3: the classic wc-add-to-cart.js AJAX flow still pushes immediately', () => {
		sandbox = loadPlugin( { ajaxAddToCart: true } );
		const el = makeElement( {
			tag: 'a',
			classes: [ 'ajax_add_to_cart' ],
			attrs: { href: '?add-to-cart=5', 'data-product_id': '5' },
		} );

		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '5' }, el );

		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );
		expect( sandbox.pluginGtmServerSide.pendingAddToCart ).toBeNull();
	} );

	it( 'AC3: a held item flushes exactly once on added_to_cart, and a second flush with nothing pending pushes nothing', () => {
		const el = makeElement( { tag: 'a', attrs: { href: '?add-to-cart=6' } } );
		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '6' }, el );
		expect( sandbox.dataLayer ).toHaveLength( 0 );

		sandbox.pluginGtmServerSide.flushPendingAddToCart();
		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );

		sandbox.pluginGtmServerSide.flushPendingAddToCart();
		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );
	} );
} );

describe( 'flushPendingAddToCart() token cookie (DEV-13298)', () => {
	const DELETE_COOKIE = 'gtm_server_side_add_to_cart=; max-age=-1; path=/';

	function holdFormCartAdd( sandbox ) {
		const el = makeElement( { tag: 'button', classes: [ 'single_add_to_cart_button' ], inFormCart: true } );
		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '7' }, el );
	}

	it( 'deletes the token cookie when it pushes a held add on added_to_cart', () => {
		const sandbox = loadPlugin();
		holdFormCartAdd( sandbox );
		expect( sandbox.document.cookie ).toBe( '' );

		sandbox.pluginGtmServerSide.flushPendingAddToCart();

		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );
		expect( sandbox.document.cookie ).toBe( DELETE_COOKIE );
	} );

	it( 'keeps the token cookie when the held add expired and nothing was pushed', () => {
		const sandbox = loadPlugin();
		holdFormCartAdd( sandbox );
		sandbox.pluginGtmServerSide.pendingAddToCart.time -= sandbox.pluginGtmServerSide.PENDING_ADD_TO_CART_MAX_AGE + 1;

		sandbox.pluginGtmServerSide.flushPendingAddToCart();

		expect( sandbox.dataLayer ).toHaveLength( 0 );
		expect( sandbox.document.cookie ).toBe( '' );
	} );

	it( 'keeps the token cookie for an immediate push, which the server never stashed', () => {
		const sandbox = loadPlugin();
		const el      = makeElement( { tag: 'button', classes: [ 'wp-block-woocommerce-product-button' ] } );

		sandbox.pluginGtmServerSide.trackAddToCart( { item_id: '8' }, el );

		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' ) ).toHaveLength( 1 );
		expect( sandbox.document.cookie ).toBe( '' );
	} );

	it( 'with custom event names, deletes the cookie only once the cart state response pushes the event', () => {
		const sandbox = loadPlugin( { customEventName: true } );
		holdFormCartAdd( sandbox );

		sandbox.pluginGtmServerSide.flushPendingAddToCart();
		sandbox.runTimers();

		expect( sandbox.dataLayer ).toHaveLength( 0 );
		expect( sandbox.document.cookie ).toBe( '' );

		sandbox.respondToPosts( { success: true, data: { items: [] } } );

		expect( sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart_stape' ) ).toHaveLength( 1 );
		expect( sandbox.document.cookie ).toBe( DELETE_COOKIE );
	} );
} );

describe( 'pushVariationProduct() item (DEV-14072)', () => {
	const PARENT_INPUTS = { gtm_item_id: '12', gtm_item_sku: 'hoodie', gtm_price: '30.00' };
	const BLUE_M        = {
		variation_id: 14,
		gtm_item: { item_id: '14', item_sku: 'hoodie-blue-m', item_name: 'Hoodie - Blue, M', price: '32.00' },
	};

	function variationForm( { foundVariation, variationId } ) {
		const values = { '[name=variation_id]': variationId, '[name=quantity]': '2' };
		return {
			data( key ) {
				return 'gtm_found_variation' === key ? foundVariation : undefined;
			},
			find( sel ) {
				if ( '[name^=attribute_] option:selected' === sel ) {
					return { each( fn ) { [ 'Blue', 'M' ].forEach( ( text ) => fn.call( { text } ) ); } };
				}
				return { length: sel in values ? 1 : 0, val: () => values[ sel ] };
			},
		};
	}

	function addOverAjax( $form ) {
		const sandbox = loadPlugin();
		const plugin  = sandbox.pluginGtmServerSide;
		sandbox.jQuery = ( arg ) => ( arg && 'string' === typeof arg.text ? { text: () => arg.text } : jQueryShim( arg ) );
		plugin.convertInputsToObject = () => Object.assign( {}, PARENT_INPUTS );

		const button = makeElement( { tag: 'button', classes: [ 'single_add_to_cart_button' ], inFormCart: true } );
		plugin.pushVariationProduct( $form, button );
		plugin.flushPendingAddToCart();

		const pushed = sandbox.dataLayer.filter( ( e ) => e.event === 'add_to_cart' );
		expect( pushed ).toHaveLength( 1 );

		return pushed[ 0 ].ecommerce;
	}

	it( 'reports the variation WooCommerce found for the chosen options', () => {
		const ecommerce = addOverAjax( variationForm( { foundVariation: BLUE_M, variationId: '14' } ) );

		expect( ecommerce.value ).toBe( '64.00' );
		expect( ecommerce.items ).toEqual( [
			{ ...BLUE_M.gtm_item, quantity: 2, item_variant: 'Blue,M', index: 1 },
		] );
	} );

	it( 'falls back to the parent when the found variation is not the one in the form', () => {
		const ecommerce = addOverAjax( variationForm( { foundVariation: BLUE_M, variationId: '13' } ) );

		expect( ecommerce.items[ 0 ] ).toMatchObject( { item_id: '12', price: '30.00', quantity: 2 } );
	} );

	it( 'falls back to the parent when no variation item reached the page', () => {
		const ecommerce = addOverAjax( variationForm( { foundVariation: undefined, variationId: '14' } ) );

		expect( ecommerce.items[ 0 ] ).toMatchObject( { item_id: '12', price: '30.00', quantity: 2 } );
	} );
} );
