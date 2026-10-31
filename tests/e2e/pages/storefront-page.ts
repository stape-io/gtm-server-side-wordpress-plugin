import type { Page, Request, Response } from '@playwright/test';

/**
 * Any storefront page, opened by its path, for a case about what every page
 * prints into its head whatever it shows (the GTM snippet): home, shop, a
 * product, cart, My Account, search, a 404.
 */
export class StorefrontPage {
	/** The page goto() opened, as the server sent it. */
	private landing: Response | null = null;

	/** Every request the browser made since goto() started, in order. */
	private requests: Request[] = [];

	constructor( private readonly page: Page ) {
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

	/** The HTML of the page goto() opened, as View Source shows it: before any script ran. */
	async source(): Promise< string > {
		if ( ! this.landing ) {
			throw new Error( 'Call goto() first: source() is the HTML of the page it opens.' );
		}
		return this.landing.text();
	}

	/**
	 * The URLs the page goto() opened requested that contain `filter`, as
	 * DevTools → Network lists them with that filter. A snapshot: the scripts
	 * the head inserts are requested before the load event goto() waits for.
	 */
	requestedUrls( filter: string ): string[] {
		return this.requests.map( ( request ) => request.url() ).filter( ( url ) => url.includes( filter ) );
	}
}
