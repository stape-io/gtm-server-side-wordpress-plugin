import { expect, test } from '../fixtures';

/**
 * The store's same-origin proxy answers on /metrics, with no API key stored
 * (bin/wp-env-configure.sh). Each test supplies a key for its own requests; its
 * ":test" TLD sends the proxy to https://proxy.e2e.stape.test, which
 * tests/e2e/mu-plugins/stub-same-origin-upstream.php answers with the URL it
 * was sent. The body is therefore exactly what the container would receive.
 *
 * The requests go through WordPress's real rewrite handling, which trims a
 * trailing slash off the path before the proxy sees it.
 */

const PROXY_KEY = 'e2e:proxy:key:test';
const UPSTREAM = 'https://proxy.e2e.stape.test';

// base64 of id=GTM-XXX&dn=localhost&sop=/metrics, as the first-party Google tag uses.
const FPS_ID = 'aWQ9R1RNLVhYWCZkbj1sb2NhbGhvc3Qmc29wPS9tZXRyaWNz';

test( 'A request under the proxy path reaches the container with the same sub-path and query string @T16f419d1', async ( {
	storeOptions,
	sameOriginProxy,
} ) => {
	await storeOptions( { sameOriginApiKey: PROXY_KEY } );

	const collect = await sameOriginProxy.get( '/metrics/g/collect?v=2&tid=G-XXX&en=page_view' );
	expect( await collect.text() ).toBe( `${ UPSTREAM }/g/collect?v=2&tid=G-XXX&en=page_view` );
} );

test( 'A trailing slash on the sub-path reaches the container @T95d7f77c', async ( {
	storeOptions,
	sameOriginProxy,
} ) => {
	await storeOptions( { sameOriginApiKey: PROXY_KEY } );

	// The first-party Google tag URL, which the container rejects without the slash.
	const fps = await sameOriginProxy.get( `/metrics/fps/${ FPS_ID }/?id=G-XXX&cx=c&gtm=4e69p1&f=1` );
	expect( await fps.text() ).toBe( `${ UPSTREAM }/fps/${ FPS_ID }/?id=G-XXX&cx=c&gtm=4e69p1&f=1` );

	const g = await sameOriginProxy.get( '/metrics/g/?v=2' );
	expect( await g.text() ).toBe( `${ UPSTREAM }/g/?v=2` );
} );

test( 'A sub-path without a trailing slash reaches the container without one @Tb12b98a0', async ( {
	storeOptions,
	sameOriginProxy,
} ) => {
	await storeOptions( { sameOriginApiKey: PROXY_KEY } );

	const fps = await sameOriginProxy.get( `/metrics/fps/${ FPS_ID }?id=G-XXX` );
	expect( await fps.text() ).toBe( `${ UPSTREAM }/fps/${ FPS_ID }?id=G-XXX` );
} );

test( 'A .load request reaches the container as .js and is answered as JavaScript @Tb5748d7d', async ( {
	storeOptions,
	sameOriginProxy,
} ) => {
	await storeOptions( { sameOriginApiKey: PROXY_KEY } );

	const loader = await sameOriginProxy.get( '/metrics/abcdef.load?id=GTM-XXX' );
	expect( await loader.text() ).toBe( `${ UPSTREAM }/abcdef.js?id=GTM-XXX` );
	// The stub answers text/plain, so this type comes from the proxy.
	expect( loader.headers()[ 'content-type' ] ).toBe( 'application/javascript; charset=utf-8' );
} );
