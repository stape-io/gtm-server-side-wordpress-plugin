import type { Page } from '@playwright/test';
import type { CreatedPage } from '../api/pages';
import type { CreatedProduct } from '../api/products';

/**
 * A page holding the classic cart (`[woocommerce_cart]`), in the block theme:
 * WooCommerce's own `cart.js` posts the cart form over AJAX and swaps the
 * form in place, so updating a quantity loads no new page.
 */
export class ClassicCartPage {
	constructor( private readonly page: Page ) {}

	async goto( cartPage: CreatedPage ): Promise< void > {
		await this.page.goto( cartPage.link );
	}

	/**
	 * Types a new quantity into the product's line key by key, as a shopper
	 * does, without pressing Enter. Key by key, since the plugin listens for
	 * keypress in that field.
	 */
	async setQuantity( product: CreatedProduct, quantity: number ): Promise< void > {
		const field = this.quantityField( product );
		await field.click();
		await field.press( 'ControlOrMeta+A' );
		await field.pressSequentially( String( quantity ) );
	}

	/** Clicks "Update cart" and waits until WooCommerce has updated the cart. */
	async updateCart(): Promise< void > {
		await this.page.getByRole( 'button', { name: 'Update cart' } ).click();
		await this.waitForCartUpdated();
	}

	/**
	 * Types a new quantity as setQuantity() does and presses Enter, on which
	 * WooCommerce updates the cart; then waits until it has.
	 */
	async submitQuantityWithEnter( product: CreatedProduct, quantity: number ): Promise< void > {
		await this.setQuantity( product, quantity );
		await this.quantityField( product ).press( 'Enter' );
		await this.waitForCartUpdated();
	}

	/** The quantity field in the product's line; every line's field is named "Product quantity". */
	private quantityField( product: CreatedProduct ) {
		return this.page
			.getByRole( 'row' )
			.filter( { has: this.page.getByRole( 'link', { name: product.name, exact: true } ) } )
			.getByRole( 'spinbutton', { name: 'Product quantity' } );
	}

	private async waitForCartUpdated(): Promise< void > {
		await this.page.getByRole( 'alert' ).filter( { hasText: 'Cart updated.' } ).waitFor();
	}
}
