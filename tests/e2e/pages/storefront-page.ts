import type { CDPSession, Cookie, Page, Request, Response } from '@playwright/test';

/**
 * Any storefront page, opened by its path, for a case about what every page
 * prints into its head whatever it shows (the GTM snippet): home, shop, a
 * product, cart, My Account, search, a 404.
 */
export class StorefrontPage {
	/** The page goto() opened, as the server sent it. */
	private landing: Response | null = null;

	/** The DevTools protocol session emulateUserAgent() opened, kept for the rest of the test. */
	private devTools: CDPSession | null = null;

	/** Every request the browser made since goto() started, in order. */
	private requests: Request[] = [];

	constructor(
		private readonly page: Page,
		private readonly baseURL: string
	) {
		// Reset when goto() starts, not when the new page commits: Playwright can
		// report the head's script requests before the main frame's navigation.
		page.on( 'request', ( request ) => this.requests.push( request ) );
	}

	/**
	 * Opens `path` (`/`, `/?s=…`, a product's permalink) and waits for its
	 * load event. A 404 page opens like any other.
	 */
	async goto( path: string ): Promise< void > {
		this.requests = [];
		this.landing = await this.page.goto( path );
	}

	/** Reloads the page goto() opened, as the browser's reload button does; source() and requestedUrls() are the reload's. */
	async reload(): Promise< void > {
		this.requests = [];
		this.landing = await this.page.reload();
	}

	/**
	 * The `Set-Cookie` headers for `name` the server sent with the page goto()
	 * or reload() opened, as `curl -D -` prints them after `Set-Cookie: `.
	 */
	async setCookieHeaders( name: string ): Promise< string[] > {
		if ( ! this.landing ) {
			throw new Error( 'Call goto() first: setCookieHeaders() reads the response of the page it opens.' );
		}
		return ( await this.landing.headersArray() )
			.filter( ( header ) => header.name.toLowerCase() === 'set-cookie' )
			.map( ( header ) => header.value )
			.filter( ( value ) => value.startsWith( `${ name }=` ) );
	}

	/** The browser's cookie `name` for the store, as DevTools → Application → Cookies shows it. */
	async cookie( name: string ): Promise< Cookie | undefined > {
		return ( await this.page.context().cookies( this.baseURL ) ).find( ( cookie ) => cookie.name === name );
	}

	/** Gives the browser cookie `name` the value `value` for the store, as editing it in DevTools → Application → Cookies does. */
	async setCookie( name: string, value: string ): Promise< void > {
		await this.page.context().addCookies( [ { name, value, url: this.baseURL } ] );
	}

	/**
	 * Sends `userAgent` from now on, in the header and as navigator.userAgent,
	 * as DevTools → Network conditions → User agent does: for the rest of the
	 * test, across navigations, until it is called again.
	 */
	async emulateUserAgent( userAgent: string ): Promise< void > {
		this.devTools ??= await this.page.context().newCDPSession( this.page );
		await this.devTools.send( 'Emulation.setUserAgentOverride', { userAgent } );
	}

	/** The HTML of the page goto() opened, as View Source shows it: before any script ran. */
	async source(): Promise< string > {
		if ( ! this.landing ) {
			throw new Error( 'Call goto() first: source() is the HTML of the page it opens.' );
		}
		return this.landing.text();
	}

	/** A global a script on the page set (`snipApiLoader`), as the DevTools console reads `window.<name>`. */
	async windowValue( name: string ): Promise< unknown > {
		return this.page.evaluate( ( key ) => ( window as unknown as Record< string, unknown > )[ key ], name );
	}

	/**
	 * The `type` of the element with id `id` (`custom-loader`, the GTM
	 * snippet's script in consent mode), as the DevTools console reads
	 * `document.getElementById( id ).type`; `undefined` if there is no such script.
	 */
	async scriptType( id: string ): Promise< string | undefined > {
		return this.page.evaluate( ( elementId ) => {
			const element = document.getElementById( elementId );
			return element instanceof HTMLScriptElement ? element.type : undefined;
		}, id );
	}

	/**
	 * Runs `gtag( ...args )` in the DevTools console, defining gtag first the
	 * way the cases do, since the page has none:
	 * `function gtag(){ dataLayer.push(arguments); }`. So the push is an
	 * `arguments` object, as a real gtag's is, not an array.
	 */
	async gtag( ...args: unknown[] ): Promise< void > {
		await this.page.evaluate( ( gtagArgs ) => {
			const w = window as unknown as { dataLayer: unknown[] };
			function gtag( ..._: unknown[] ) {
				// eslint-disable-next-line prefer-rest-params -- gtag pushes its arguments object, which the consent script reads.
				w.dataLayer.push( arguments );
			}
			gtag( ...gtagArgs );
		}, args );
	}

	/** Runs `dataLayer.push( entry )` in the DevTools console: a plain array or object, not gtag's `arguments`. */
	async pushToDataLayer( entry: unknown ): Promise< void > {
		await this.page.evaluate( ( pushed ) => {
			( window as unknown as { dataLayer: unknown[] } ).dataLayer.push( pushed );
		}, entry );
	}

	/**
	 * The URLs the page goto() opened requested that contain `filter`, as
	 * DevTools → Network lists them with that filter. A snapshot: the scripts
	 * the head inserts are requested before the load event goto() waits for.
	 * A script inserted later (GTM released by a consent push) adds its
	 * request when it is made, so a spec polls for that one.
	 */
	requestedUrls( filter: string ): string[] {
		return this.requests.map( ( request ) => request.url() ).filter( ( url ) => url.includes( filter ) );
	}
}
