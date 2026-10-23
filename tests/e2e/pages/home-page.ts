import type { Page } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/** The store's front page. */
export class HomePage {
	constructor( private readonly page: Page ) {}

	/**
	 * Opens the front page through an `?add-to-cart=` link, which adds one of
	 * `product` on the way, the way the cases put a product in the cart.
	 */
	async gotoAddingToCart( product: CreatedProduct ): Promise< void > {
		await this.page.goto( `/?add-to-cart=${ product.id }` );
	}
}
