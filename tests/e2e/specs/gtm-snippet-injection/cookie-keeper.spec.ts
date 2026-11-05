import { expect, test } from '../../fixtures';
import { SGTM_URL, GTM_START, ENCODED_TESTID, ABCDEFGH_LOADER } from '../../data-layer/gtm-snippet';

/** The cases' Cookie Keeper setup. */
const COOKIE_KEEPER = { webContainerUrl: SGTM_URL, webIdentifier: 'abcdefgh', cookieKeeper: 'yes' } as const;

/** The folder's Browser user agents. */
const SAFARI_17_4 =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const SAFARI_16_3 =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15';

/**
 * The Cookie Keeper snippet's variables for GTM-TESTID and `abcdefgh`, with
 * `<PREFIX>`, `c`, `<R>` and `<E>` captured. `<E>`'s `type=` is the first 8 hex
 * characters of md5( 'abcdefgh' ). The separator in `c` is `&amp;` today,
 * which the cases leave out ("Not covered here"), so `&` passes too.
 */
const COOKIE_KEEPER_VARIABLES = new RegExp(
	`o="https://sgtm\\.example\\.test",a="",i="([A-Za-z0-9]{1,5})abcdefgh",c="(([A-Za-z0-9]{1,8})=${ ENCODED_TESTID }(?:&amp;|&)(cgm=nmB|asq=2|tl=dr|type=e8dc4081|sort=asc|sort=desc))",g="cookie",v="_sbp"`
);

/** A new `_sbp`, as `curl -D -` prints it after `Set-Cookie: `, with its value and expiry captured. */
const SBP_SET =
	/^_sbp=([0-9a-f]{32}); expires=(\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2}) GMT; Max-Age=63072000; path=\/; domain=\.localhost; secure; SameSite=lax$/;

const SBP_DELETED =
	'_sbp=deleted; expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; path=/; domain=.localhost; secure; SameSite=lax';

const TWO_YEARS_MS = 63072000 * 1000;
const FOUR_HUNDRED_DAYS_MS = 400 * 24 * 60 * 60 * 1000;
/** Slack for the clocks of the test and the server, and the request's own time. */
const CLOCK_SLACK_MS = 60 * 1000;

test( 'With Cookie Keeper on, a first visit receives an `_sbp` cookie (path `/`, 2 years, SameSite=Lax) @Tf52a77b2', async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	await loaderCache.isolate();
	await storeOptions( COOKIE_KEEPER );

	// The case's curl sends no cookies: neither does this first visit, but for
	// the storeOptions() ones.
	const sent = Date.now();
	await storefrontPage.goto( '/' );
	const received = Date.now();

	const cookie = await storefrontPage.cookie( '_sbp' );
	expect( cookie ).toEqual( {
		name: '_sbp',
		value: expect.stringMatching( /^[0-9a-f]{32}$/ ),
		domain: 'localhost',
		path: '/',
		expires: expect.any( Number ),
		httpOnly: false,
		secure: true,
		sameSite: 'Lax',
	} );
	// Chromium caps a cookie's lifetime at 400 days.
	const stored = ( cookie?.expires ?? 0 ) * 1000;
	expect( stored ).toBeGreaterThan( sent + FOUR_HUNDRED_DAYS_MS - CLOCK_SLACK_MS );
	expect( stored ).toBeLessThan( received + FOUR_HUNDRED_DAYS_MS + CLOCK_SLACK_MS );

	const headers = await storefrontPage.setCookieHeaders( '_sbp' );
	expect( headers ).toHaveLength( 1 );
	expect( headers[ 0 ] ).toMatch( SBP_SET );
	const [ , , expires ] = headers[ 0 ].match( SBP_SET ) ?? [];
	const sentExpiry = Date.parse( `${ expires } GMT` );
	expect( sentExpiry ).toBeGreaterThan( sent + TWO_YEARS_MS - CLOCK_SLACK_MS );
	expect( sentExpiry ).toBeLessThan( received + TWO_YEARS_MS + CLOCK_SLACK_MS );
} );

test( 'A visitor who already has `_sbp` keeps the same value on later visits @Tf37556bc', async ( {
	product,
	loaderCache,
	storeOptions,
	newSession,
	storefrontPage,
} ) => {
	await loaderCache.isolate();
	await storeOptions( COOKIE_KEEPER );

	await storefrontPage.setCookie( '_sbp', 'existing123' );
	await storefrontPage.goto( '/' );
	// Cookie Keeper is on for this response, so no header means it kept the cookie.
	expect( await storefrontPage.source() ).toContain( 'g="cookie",v="_sbp"' );
	expect( await storefrontPage.setCookieHeaders( '_sbp' ) ).toEqual( [] );

	await newSession();
	await loaderCache.isolate();
	await storeOptions( COOKIE_KEEPER );

	await storefrontPage.goto( '/' );
	const first = ( await storefrontPage.cookie( '_sbp' ) )?.value;
	expect( first ).toMatch( /^[0-9a-f]{32}$/ );

	const values: Record< string, string | undefined > = {};
	await storefrontPage.reload();
	values[ 'reload 1' ] = ( await storefrontPage.cookie( '_sbp' ) )?.value;
	await storefrontPage.reload();
	values[ 'reload 2' ] = ( await storefrontPage.cookie( '_sbp' ) )?.value;
	await storefrontPage.goto( product.permalink );
	values.product = ( await storefrontPage.cookie( '_sbp' ) )?.value;
	await storefrontPage.goto( '/shop/' );
	values.shop = ( await storefrontPage.cookie( '_sbp' ) )?.value;
	expect( values ).toEqual( { 'reload 1': first, 'reload 2': first, product: first, shop: first } );
} );

test( 'In Safari 16.4+ the loader URL carries the `kp` identifier and `bi=<_sbp value>` @Te245881b', async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	await loaderCache.isolate();
	await storeOptions( COOKIE_KEEPER );
	await storefrontPage.emulateUserAgent( SAFARI_17_4 );

	await storefrontPage.goto( '/' );
	// c starts with `<R>=aWQ9R1RNLVRFU1RJRA%3D%3D`, which the pattern requires.
	const [ , prefix, c ] = ( await storefrontPage.source() ).match( COOKIE_KEEPER_VARIABLES ) ?? [];
	expect( prefix, 'i="<PREFIX>abcdefgh",c="<R>=…" in the page source' ).toBeDefined();
	expect( prefix ).not.toMatch( /(kp|gt)$/i );

	// Set by the same response that printed the snippet.
	const sbp = ( await storefrontPage.cookie( '_sbp' ) )?.value;
	expect( sbp ).toMatch( /^[0-9a-f]{32}$/ );
	expect( storefrontPage.requestedUrls( 'abcdefgh' ) ).toEqual( [ `${ SGTM_URL }/${ prefix }kpabcdefgh.js?${ c }&bi=${ sbp }` ] );

	await storefrontPage.setCookie( '_sbp', 'preset42' );
	await storefrontPage.reload();
	expect( storefrontPage.requestedUrls( 'abcdefgh' ) ).toEqual( [ `${ SGTM_URL }/${ prefix }kpabcdefgh.js?${ c }&bi=preset42` ] );
} );

test( 'In Chrome and in Safari below 16.4 the Cookie Keeper snippet loads the plain identifier URL without `bi` @Td510fd37', async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	await loaderCache.isolate();
	await storeOptions( COOKIE_KEEPER );

	await storefrontPage.goto( '/' );
	const [ , prefix, c ] = ( await storefrontPage.source() ).match( COOKIE_KEEPER_VARIABLES ) ?? [];
	expect( prefix, 'i="<PREFIX>abcdefgh",c="…" in the page source' ).toBeDefined();
	const i = `${ prefix }abcdefgh`;

	await storefrontPage.goto( '/' );
	expect( storefrontPage.requestedUrls( 'abcdefgh' ) ).toEqual( [ `${ SGTM_URL }/${ i }.js?${ c }` ] );

	await storefrontPage.emulateUserAgent( SAFARI_16_3 );
	await storefrontPage.setCookie( '_sbp', 'preset42' );
	await storefrontPage.reload();
	expect( storefrontPage.requestedUrls( 'abcdefgh' ) ).toEqual( [ `${ SGTM_URL }/${ i }.js?${ c }` ] );
} );

test( "Turning Cookie Keeper off deletes a visitor's `_sbp` cookie on the next page view @Tea269f78", async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	await loaderCache.isolate();
	await storeOptions( COOKIE_KEEPER );

	await storefrontPage.goto( '/' );
	expect( await storefrontPage.cookie( '_sbp' ) ).toBeDefined();

	// What the unticked checkbox saves.
	await storeOptions( { cookieKeeper: '' } );
	await storefrontPage.reload();
	expect( await storefrontPage.cookie( '_sbp' ) ).toBeUndefined();

	await storefrontPage.setCookie( '_sbp', 'old1' );
	await storefrontPage.goto( '/' );
	expect( await storefrontPage.setCookieHeaders( '_sbp' ) ).toEqual( [ SBP_DELETED ] );

	await storefrontPage.goto( '/' );
	const [ , prefix ] = ( await storefrontPage.source() ).match( ABCDEFGH_LOADER ) ?? [];
	expect( prefix, 'j.src="https://sgtm.example.test/<PREFIX>abcdefgh.js?"' ).toBeDefined();
	expect( prefix ).not.toMatch( /(kp|gt)$/i );
} );

test( "With same-origin configured, Cookie Keeper is ignored and a visitor's `_sbp` is deleted @T6a782b89", async ( {
	optionWrites,
	loaderCache,
	storeOptions,
	newSession,
	storefrontPage,
} ) => {
	// The e2e store has same-origin on with the path `/metrics` (the case's is
	// `/gtm`); the key completes it, on every page, with no loader from the
	// Stape API, as after the case's WP-CLI writes.
	const settings = { ...COOKIE_KEEPER, sameOriginApiKeyOnEveryPage: 'eu1:sotestid:secretpart' };
	await loaderCache.isolate();
	await storeOptions( settings );

	await storefrontPage.setCookie( '_sbp', 'old1' );
	await storefrontPage.goto( '/' );
	expect( await storefrontPage.setCookieHeaders( '_sbp' ) ).toEqual( [ SBP_DELETED ] );

	// A fresh private window, on the same store; optionWrites keeps recording.
	await newSession();
	await loaderCache.isolate();
	await storeOptions( settings );
	await storefrontPage.goto( '/' );
	const source = await storefrontPage.source();
	expect( source ).not.toContain( 'g="cookie"' );
	expect( source ).toContain( "'https://www.googletagmanager.com/gtm.js?id='+i+dl" );
	expect( source ).toContain( "'dataLayer','GTM-TESTID');</script>" );
	expect( storefrontPage.requestedUrls( 'sgtm.example.test' ) ).toEqual( [] );

	// The setting lives in this test's cookie, so `wp option get` would read
	// the database: what shows it was kept is that the plugin never wrote it.
	await optionWrites.expectNone();
} );

test( 'With Cookie Keeper on, the Cookie Keeper snippet is printed instead of the identifier snippet @T07c46364', async ( {
	loaderCache,
	storeOptions,
	storefrontPage,
} ) => {
	await loaderCache.isolate();
	await storeOptions( COOKIE_KEEPER );

	await storefrontPage.goto( '/' );
	const source = await storefrontPage.source();
	expect( source.split( GTM_START ) ).toHaveLength( 2 );
	const [ , prefix, , r, e ] = source.match( COOKIE_KEEPER_VARIABLES ) ?? [];
	expect( prefix, 'o="https://sgtm.example.test",a="",i="<PREFIX>abcdefgh",c="<R>=…<E>",g="cookie",v="_sbp"' ).toBeDefined();
	expect( prefix ).not.toMatch( /(kp|gt)$/i );
	expect( source ).not.toContain( 'gtm.js?id=' );
	expect( source ).not.toContain( 'j.src=' );

	// The cache holds what the snippet printed, with `&` where c has `&amp;`.
	expect( await loaderCache.read() ).toEqual( {
		identifier: `${ prefix }abcdefgh`,
		containerId: `${ r }=${ ENCODED_TESTID }&${ e }`,
	} );
} );
