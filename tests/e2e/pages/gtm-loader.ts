import type { Page } from '@playwright/test';

/**
 * The GTM snippet as placement "Load GTM with consent" prints it: a
 * `<script type="text/plain" id="custom-loader">` the plugin's consent script
 * turns into a running script once consent is granted. Part of every page.
 */
export class GtmLoader {
	/** Every gtm.js request the test's page made, in order, from when the test began. */
	private readonly gtmJs: string[] = [];

	constructor( private readonly page: Page ) {
		page.on( 'request', ( request ) => {
			const url = new URL( request.url() );
			if ( url.origin === 'https://www.googletagmanager.com' && url.pathname === '/gtm.js' ) {
				this.gtmJs.push( request.url() );
			}
		} );
	}

	/** The gtm.js requests so far, as DevTools → Network filtered by `gtm.js` lists them. */
	gtmJsRequests(): string[] {
		return [ ...this.gtmJs ];
	}

	/** `document.getElementById('custom-loader').type`: `text/plain` until consent releases it. */
	async loaderType(): Promise< string | undefined > {
		return this.page.evaluate( () => ( document.getElementById( 'custom-loader' ) as HTMLScriptElement | null )?.type );
	}

	/**
	 * Runs `gtag( ...args )` with the console's `function gtag(){ dataLayer.push(arguments); }`:
	 * the page has no gtag of its own, and a consent tool pushes an
	 * `arguments` object, not an array.
	 */
	async gtag( ...args: unknown[] ): Promise< void > {
		await this.page.evaluate( ( commandArgs ) => {
			const w = window as unknown as { dataLayer: unknown[] };
			function gtag( ..._args: unknown[] ) {
				// eslint-disable-next-line prefer-rest-params -- gtag pushes its arguments object, which the consent script reads.
				w.dataLayer.push( arguments );
			}
			gtag( ...commandArgs );
		}, args );
	}

	/** Runs `dataLayer.push( entry )` with a plain array, the other way a consent command reaches the dataLayer. */
	async pushArray( entry: unknown[] ): Promise< void > {
		await this.page.evaluate( ( pushed ) => {
			( window as unknown as { dataLayer: unknown[] } ).dataLayer.push( pushed );
		}, entry );
	}
}
