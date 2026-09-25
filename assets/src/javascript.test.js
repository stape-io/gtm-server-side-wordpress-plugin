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
function loadPlugin( { ajaxAddToCart = false } = {} ) {
	const sandbox = {
		jQuery: jQueryShim,
		document: { body: { __isElement: false } },
		dataLayer: [],
		varGtmServerSide: {
			currency: 'USD',
			is_custom_event_name: 'no',
			user_data: false,
		},
		console,
	};
	if ( ajaxAddToCart ) {
		sandbox.wc_add_to_cart_params = {};
	}
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
