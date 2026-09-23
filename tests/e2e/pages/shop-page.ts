import type { Page } from '@playwright/test';

/**
 * Storefront page object for /shop/. Locators are keyed by product name
 * (not SKU or CSS class) so specs read the way a shopper would describe the
 * page and stay resilient to markup/theme changes (see Playwright's
 * best-practices guidance on role/user-facing locators).
 */
export class ShopPage {
	constructor( private readonly page: Page ) {}

	async goto() {
		await this.page.goto( '/shop/' );
	}

	productCard( productName: string ) {
		return this.page.getByRole( 'listitem' ).filter( { hasText: productName } );
	}

	addToCartButton( productName: string ) {
		return this.productCard( productName ).getByRole( 'button', { name: /add to cart/i } );
	}

	/**
	 * Clicks "Add to cart", and nothing more.
	 *
	 * Deliberately does not wait on a specific endpoint. How the cart mutation
	 * travels is a property of the active theme - the block Product Collection
	 * grid batches it into POST wc/store/v1/batch via the Interactivity API,
	 * while classic themes use the wc-ajax=add_to_cart admin-ajax endpoint -
	 * and a page object that hard-codes one of them breaks the moment the
	 * theme changes, which is exactly what it exists to absorb.
	 *
	 * Specs wait on the outcome they actually care about instead (the
	 * dataLayer event - see fixtures/data-layer.ts).
	 */
	async addToCart( productName: string ): Promise< void > {
		await this.addToCartButton( productName ).click();
	}
}
