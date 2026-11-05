import { expect, type Locator, type Page, type Response } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/** The store's front page. */
export class HomePage {
	/** The page goto() opened, as the server sent it. */
	private landing: Response | null = null;

	constructor( private readonly page: Page ) {}

	/** Opens `/`, or `/?<query>` with `query` (a UTM link, say). */
	async goto( query?: Record< string, string > ): Promise< void > {
		this.landing = await this.page.goto( query ? `/?${ new URLSearchParams( query ).toString() }` : '/' );
	}

	/** The HTML of the page goto() opened, as View Source shows it: before any script ran. */
	async source(): Promise< string > {
		if ( ! this.landing ) {
			throw new Error( 'Call goto() first: source() is the HTML of the page it opens.' );
		}
		return this.landing.text();
	}

	/**
	 * The site footer, the last part of the page the theme renders before
	 * wp_footer: the front page's main content is the theme's blog, nothing a
	 * test creates.
	 */
	get footer(): Locator {
		return this.page.getByRole( 'contentinfo' );
	}

	/**
	 * Opens the front page through an `?add-to-cart=` link, which adds
	 * `quantity` of `product` (one without it) on the way, the way the cases
	 * put a product in the cart.
	 */
	async gotoAddingToCart( product: CreatedProduct, quantity?: number ): Promise< void > {
		await this.page.goto( this.addToCartUrl( product, quantity ) );
	}

	/**
	 * Requests the same `?add-to-cart=` link without rendering the page, for a
	 * case that only needs the product in the cart. The rendered front page
	 * fetches the cart over the Store API, and when the next add starts before
	 * that request has saved the session, it saves the cart without the new
	 * line. The request carries the test's cookies, so it fills the same cart.
	 */
	async addToCart( product: CreatedProduct, quantity?: number ): Promise< void > {
		const response = await this.page.request.get( this.addToCartUrl( product, quantity ) );
		expect( response.ok(), `Adding product ${ product.id } to the cart` ).toBe( true );
	}

	private addToCartUrl( product: CreatedProduct, quantity?: number ): string {
		return `/?add-to-cart=${ product.id }${ quantity !== undefined ? `&quantity=${ quantity }` : '' }`;
	}
}
