import type { Page } from '@playwright/test';
import type { CreatedProduct } from '../api/products';

/** Single product page. */
export class ProductPage {
	constructor( private readonly page: Page ) {}

	async goto( product: CreatedProduct ) {
		await this.page.goto( product.permalink );
	}

	/**
	 * Submits the product form, which posts and reloads the page, and waits for
	 * WooCommerce's "added to your cart" notice (an alert) on the reloaded
	 * page. The form, not a grid button: related products on the same page
	 * have their own.
	 */
	async addToCart(): Promise< void > {
		// eslint-disable-next-line playwright/no-raw-locators -- form.cart is WooCommerce core markup; the form has no accessible name.
		await this.page.locator( 'form.cart' ).getByRole( 'button', { name: /add to cart/i } ).click();
		await this.page.getByRole( 'alert' ).filter( { hasText: /has been added to your cart/i } ).waitFor();
	}
}
