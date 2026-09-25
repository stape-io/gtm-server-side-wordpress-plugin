import type { Page } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/** Single product page. */
export class ProductPage {
	constructor( private readonly page: Page ) {}

	async goto( product: CreatedProduct ) {
		await this.page.goto( product.permalink );
	}
}
