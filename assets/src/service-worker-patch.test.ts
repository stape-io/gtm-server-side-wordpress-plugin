import { describe, expect, it, vi } from 'vitest';
import {
	installServiceWorkerPatch,
	rewriteScriptUrl,
	type PageLocation,
} from './service-worker-patch';

const PAGE: PageLocation = {
	href: 'https://example.com/data/_/service_worker/68j0/sw_iframe.html?1p=1',
	origin: 'https://example.com',
};

describe( 'rewriteScriptUrl', () => {
	it( 'rewrites the relative URL the container registers from the iframe', () => {
		expect( rewriteScriptUrl( 'sw.js?origin=x&path=%2Fdata', PAGE, '/data/' ) ).toBe(
			'https://example.com/data/_/service_worker/68j0/sw.load?origin=x&path=%2Fdata'
		);
	} );

	it( 'rewrites an absolute same-origin URL', () => {
		expect(
			rewriteScriptUrl( 'https://example.com/data/a/sw.js', PAGE, '/data/' )
		).toBe( 'https://example.com/data/a/sw.load' );
	} );

	it( 'carries the home path of a sub-directory install', () => {
		const page: PageLocation = { href: 'https://example.com/wp/page/', origin: 'https://example.com' };

		expect( rewriteScriptUrl( '/wp/gtm/a/sw.js', page, '/wp/gtm/' ) ).toBe(
			'https://example.com/wp/gtm/a/sw.load'
		);
	} );

	it( 'is case insensitive about the extension', () => {
		expect( rewriteScriptUrl( '/data/a/SW.JS', PAGE, '/data/' ) ).toBe(
			'https://example.com/data/a/SW.load'
		);
	} );

	it.each( [
		[ 'a script already on the proxy extension', '/data/a/sw.load' ],
		[ "the site's own service worker at the root", '/sw.js' ],
		[ "another plugin's worker", '/wp-content/plugins/pwa/service-worker.js' ],
		[ 'a path that merely looks like the proxy path', '/database/a/sw.js' ],
		[ 'another origin', 'https://cdn.example.com/data/a/sw.js' ],
		[ 'a value that is not a URL', 'http://[' ],
	] )( 'leaves %s alone', ( _label, script ) => {
		expect( rewriteScriptUrl( script, PAGE, '/data/' ) ).toBeNull();
	} );
} );

/** Minimal window stand-in: only what the patch touches. */
function fakeWindow( register?: unknown ) {
	return {
		location: { ...PAGE },
		navigator: register === undefined ? {} : { serviceWorker: { register } },
	} as unknown as Window;
}

describe( 'installServiceWorkerPatch', () => {
	it( 'does nothing when the window has no service worker support', () => {
		expect( installServiceWorkerPatch( fakeWindow(), '/data/' ) ).toBe( false );
	} );

	it( 'registers the rewritten URL and keeps the options', () => {
		const register = vi.fn().mockResolvedValue( 'registration' );
		const win = fakeWindow( register );

		installServiceWorkerPatch( win, '/data/' );
		win.navigator.serviceWorker.register( 'sw.js?path=%2Fdata', {
			scope: '/data/_/service_worker',
			updateViaCache: 'all',
		} );

		expect( register ).toHaveBeenCalledWith(
			'https://example.com/data/_/service_worker/68j0/sw.load?path=%2Fdata',
			{ scope: '/data/_/service_worker', updateViaCache: 'all' }
		);
	} );

	it( 'accepts a TrustedScriptURL style argument', () => {
		const register = vi.fn().mockResolvedValue( 'registration' );
		const win = fakeWindow( register );

		installServiceWorkerPatch( win, '/data/' );
		win.navigator.serviceWorker.register( {
			toString: () => 'sw.js',
		} as unknown as string );

		expect( register ).toHaveBeenCalledWith(
			'https://example.com/data/_/service_worker/68j0/sw.load',
			undefined
		);
	} );

	it( 'passes a registration outside the proxy path through untouched', () => {
		const register = vi.fn().mockResolvedValue( 'registration' );
		const win = fakeWindow( register );

		installServiceWorkerPatch( win, '/data/' );
		win.navigator.serviceWorker.register( '/sw.js', { scope: '/' } );

		expect( register ).toHaveBeenCalledWith( '/sw.js', { scope: '/' } );
	} );

	it( 'falls back to the original arguments when the browser refuses the rewrite', () => {
		const refused = { toString: () => 'sw.js' } as unknown as string;
		const register = vi.fn( ( script: unknown ) => {
			if ( 'string' === typeof script ) {
				throw new TypeError( 'Trusted Types refused a plain string' );
			}
			return Promise.resolve( 'registration' );
		} );
		const win = fakeWindow( register );

		installServiceWorkerPatch( win, '/data/' );
		win.navigator.serviceWorker.register( refused );

		expect( register ).toHaveBeenCalledTimes( 2 );
		expect( register ).toHaveBeenLastCalledWith( refused, undefined );
	} );

	it( 'preserves the container as `this` and returns what register returns', () => {
		const win = fakeWindow( function ( this: unknown ) {
			return this;
		} );
		const container = win.navigator.serviceWorker;

		installServiceWorkerPatch( win, '/data/' );

		expect( container.register( 'sw.js' ) ).toBe( container );
	} );
} );
