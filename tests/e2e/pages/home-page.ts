import { expect, type Page } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/** The store's front page. */
export class HomePage {
	constructor( private readonly page: Page ) {}

	async goto(): Promise< void > {
		await this.page.goto( '/' );
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
